const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();

const fs = require('fs');
const path = require('path');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = "highland_secret_key_2026"; // In a real app, put this in .env

const NIDA_FORMAT_REGEX = /^\d{8}-\d{5}-\d{5}-\d{2}$/;
const NIDA_DIGITS_REGEX = /^\d{20}$/;

const normalizeNida = (value) => {
  const raw = (value || '').toString().trim();
  if (!raw) return null;
  if (NIDA_FORMAT_REGEX.test(raw)) return raw;
  const digits = raw.replace(/\D/g, '');
  if (NIDA_DIGITS_REGEX.test(digits)) {
    return `${digits.slice(0, 8)}-${digits.slice(8, 13)}-${digits.slice(13, 18)}-${digits.slice(18)}`;
  }
  return null;
};

const formatNidaOutput = (value) => {
  const raw = (value || '').toString().trim();
  if (!raw) return raw;
  const normalized = normalizeNida(raw);
  return normalized || raw;
};

// Enable CORS and JSON parsing FIRST (before routes)
app.use(cors());

// INCREASE LIMIT: Set to 50mb to allow high-resolution maps and logos
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// INITIALIZATION LOG: Check if the system is ready
console.log("---------------------------------------");
console.log("🚀 HIGHLAND SYSTEM (SQLite Edition) STARTING...");
const activeModels = Object.keys(prisma).filter(k => !k.startsWith('$') && k !== 'constructor');
console.log("✅ READY MODELS:", activeModels);
console.log("---------------------------------------");

// AUTHENTICATION MIDDLEWARE
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

const createNotification = async ({ userId, title, message, type = 'info' }) => {
  if (!userId) throw new Error('Notification creation requires userId');
  if (!title || !message) throw new Error('Notification creation requires title and message');

  return await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type
    }
  });
};

const createNotificationsForRole = async ({ role, title, message, type = 'info' }) => {
  const users = await prisma.user.findMany({
    where: {
      role: {
        equals: role
      }
    }
  });

  if (users.length === 0) {
    console.warn(`No notification recipients found for role="${role}"`);
    return [];
  }

  return Promise.all(users.map((user) => createNotification({
    userId: user.id,
    title,
    message,
    type
  })));
};
// --- UPDATED LOGIN ROUTE ---
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail }
    });
    if (!user) return res.status(401).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid password" });

    // Generate Token
    const token = jwt.sign(
      { id: user.id, role: String(user.role || '').toLowerCase(), name: user.fullName }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

    // RETURN USER WITH COMPLETION STATUS, SECURITY QUESTIONS, AND AVATAR
    const securityQuestions = user.securityQuestions
      ? JSON.parse(user.securityQuestions)
      : user.securityQuestion
        ? [user.securityQuestion]
        : [];

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.fullName, 
        role: String(user.role || '').toLowerCase(),
        avatar: user.avatar || null,
        passport: user.passport || null,
        isProfileComplete: user.isProfileComplete,
        securityQuestions,
        securityQuestion: securityQuestions[0] || null,
        mustChangePassword: String(user.status || '').toLowerCase() === 'must-reset'
      } 
    });
  } catch (error) { 
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" }); 
  }
});

app.put('/api/users/complete-profile/:id', async (req, res) => {
  const { id } = req.params;
  const { 
    avatar, phone, tinNumber, 
    bankName, bankAccountName, bankAccountNumber,
    kinName, kinRelation, kinPhone 
  } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        avatar, 
        phone, 
        tinNumber,
        bankName, 
        bankAccountName, 
        bankAccountNumber,
        kinName, 
        kinRelation, 
        kinPhone,
        isProfileComplete: true // CRITICAL: Flips the switch to allow access
      }
    });

    // Return the updated user info for the frontend context
    res.json({ 
      user: { 
        id: updatedUser.id, 
        name: updatedUser.fullName, 
        role: updatedUser.role,
        avatar: updatedUser.avatar || null,
        isProfileComplete: true 
      } 
    });
  } catch (error) {
    console.error("Onboarding Error:", error);
    res.status(500).json({ error: "Failed to finalize profile registration." });
  }
});

// --- UPDATED USER CREATION (Hash password) ---
app.post('/api/users', authenticateToken, async (req, res) => {
  const { fullName, email, password, role, tinNumber, securityQuestions, avatar } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();
  try {
    const hashedPassword = await bcrypt.hash(password, 10); // Hash it!
    const normalizedTin = tinNumber ? normalizeNida(tinNumber) : null;
    if (tinNumber && !normalizedTin) {
      return res.status(400).json({ error: 'NIDA must be 20 digits in the format 19981226-59421-00001-20.' });
    }

    const questions = Array.isArray(securityQuestions)
      ? securityQuestions
      : typeof securityQuestions === 'string' && securityQuestions.trim()
        ? [securityQuestions]
        : [];

    const user = await prisma.user.create({
      data: { 
        fullName, 
        email: normalizedEmail, 
        password: hashedPassword, 
        role: String(role || '').toLowerCase() || 'staff', // Normalize to lowercase
        tinNumber: normalizedTin,
        avatar: avatar || null,
        securityQuestions: questions.length > 0 ? JSON.stringify(questions) : null,
        securityQuestion: questions[0] || null
      }
    });
    const createdUser = {
      ...user,
      tinNumber: normalizedTin,
      securityQuestions: questions,
      securityQuestion: questions[0] || null
    };
    res.status(201).json({ user: createdUser });
  } catch (e) {
    res.status(400).json({ error: "Email already exists or invalid data" });
  }
});

app.put('/api/users/setup-security/:id', async (req, res) => {
  const { id } = req.params;
  const { newPassword, securityAnswers } = req.body;

  if (!newPassword) {
    return res.status(400).json({ error: 'New password is required.' });
  }

  try {
    const userRecord = await prisma.user.findUnique({ where: { id } });
    if (!userRecord) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // If this is a forced reset (status === 'must-reset'), allow setting password without recovery answers
    const isForcedReset = String(userRecord.status || '').toLowerCase() === 'must-reset';

    let updatedData = {
      password: hashedPassword,
      isProfileComplete: true,
      status: 'active'
    };

    if (!isForcedReset) {
      const answers = Array.isArray(securityAnswers)
        ? securityAnswers
        : typeof securityAnswers === 'string'
          ? [securityAnswers]
          : [];

      const hashedAnswers = await Promise.all(
        answers.map((answer) => bcrypt.hash(answer, 10))
      );

      updatedData.securityAnswer = answers.length === 1 ? await bcrypt.hash(answers[0], 10) : null;
      updatedData.securityAnswers = hashedAnswers.length > 0 ? JSON.stringify(hashedAnswers) : null;
    }

    const updatedUser = await prisma.user.update({ where: { id }, data: updatedData });

    const securityQuestions = updatedUser.securityQuestions
      ? JSON.parse(updatedUser.securityQuestions)
      : updatedUser.securityQuestion
        ? [updatedUser.securityQuestion]
        : [];

    res.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.fullName,
        role: updatedUser.role,
        avatar: updatedUser.avatar || null,
        isProfileComplete: true,
        securityQuestions,
        securityQuestion: securityQuestions[0] || null
      }
    });
  } catch (error) {
    console.error('Security setup failed:', error);
    res.status(500).json({ error: 'Failed to complete security setup.' });
  }
});

app.post('/api/users/recover-password', async (req, res) => {
  const { email, tinNumber, answer, answers, newPassword } = req.body;
  if (!email && !tinNumber) {
    return res.status(400).json({ error: 'Email or NIDA is required to recover this account.' });
  }

  try {
    let normalizedTin = null;
    if (tinNumber) {
      normalizedTin = normalizeNida(tinNumber) || tinNumber.trim();
    }

    const user = tinNumber
      ? await prisma.user.findFirst({ where: { OR: [{ tinNumber: normalizedTin }, { tinNumber: tinNumber.trim() }] } })
      : await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(400).json({ error: 'Unable to recover this account.' });
    }

    const securityQuestions = user.securityQuestions
      ? JSON.parse(user.securityQuestions)
      : user.securityQuestion
        ? [user.securityQuestion]
        : [];

    const providedAnswers = Array.isArray(answers)
      ? answers
      : answer
        ? [answer]
        : [];

    const compareAnswers = async () => {
      if (user.securityAnswers) {
        const storedAnswers = JSON.parse(user.securityAnswers);
        if (!Array.isArray(storedAnswers) || storedAnswers.length !== providedAnswers.length) {
          return false;
        }

        for (let i = 0; i < storedAnswers.length; i++) {
          if (!await bcrypt.compare(providedAnswers[i], storedAnswers[i])) {
            return false;
          }
        }
        return true;
      }

      if (user.securityAnswer) {
        return providedAnswers.length === 1 && await bcrypt.compare(providedAnswers[0], user.securityAnswer);
      }

      return false;
    };

    if (!providedAnswers.length && !newPassword) {
      return res.json({ securityQuestions, tinNumber: user.tinNumber || null });
    }

    const answersMatch = await compareAnswers();
    if (!answersMatch) {
      return res.status(401).json({ error: 'Incorrect recovery answer(s).' });
    }

    if (!newPassword) {
      return res.json({ verified: true });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });

    res.json({ message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Recover password failed:', error);
    res.status(500).json({ error: 'Password recovery failed.' });
  }
});

/**
 * 1. DASHBOARD STATS
 */
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const [clients, invoices, receipts, projects, reports] = await Promise.all([
      prisma.client.count(),
      prisma.invoice.count(),
      prisma.receipt.count(),
      prisma.project.count(),
      prisma.dailyReport.count()
    ]);
    res.json({ clients, invoices, receipts, projects, reports });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 2. CLIENTS (Buyers/Sellers)
 */
app.get('/api/clients', authenticateToken, async (req, res) => {
  try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const skip = (page - 1) * limit;
      const clientType = req.query.type?.toString().toLowerCase();
      const where = {};

      if (clientType && clientType !== 'all') {
        where.type = clientType;
      }

      // Get total count for the selected filter
      const total = await prisma.client.count({ where });

      // Get paginated data
      const data = await prisma.client.findMany({
        where,
        include: {
          invoices: {
            include: {
              project: true,
              receipts: true
            }
          },
          receipts: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      });
      
      res.json({ 
        data, 
        total, 
        page,
        limit,
        pages: Math.ceil(total / limit)
      });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.post('/api/clients', authenticateToken, async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.name || req.body.name.trim() === '') {
      return res.status(400).json({ error: "Name is required" });
    }

    // If email is provided, ensure it's not empty
    if (req.body.email === '') {
      req.body.email = null; // Convert empty string to null to avoid unique constraint
    }

    const client = await prisma.client.create({ data: req.body });
    res.status(201).json(client);
  } catch (e) { 
    console.error('Client creation error:', e.message);
    res.status(400).json({ error: e.message || "Email exists or invalid data" }); 
  }
});



app.delete('/api/clients/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Remove all related records before deleting the client to avoid referential constraint failures.
    await prisma.receipt.deleteMany({ where: { clientId: id } });
    await prisma.agreement.deleteMany({ where: { clientId: id } });
    await prisma.invoice.deleteMany({ where: { clientId: id } });

    // If client also acts as a seller, delete related projects and associated invoices/receipts.
    const sellerProjects = await prisma.project.findMany({ where: { sellerId: id }, select: { id: true } });
    const sellerProjectIds = sellerProjects.map((project) => project.id);
    if (sellerProjectIds.length > 0) {
      const projectInvoices = await prisma.invoice.findMany({ where: { projectId: { in: sellerProjectIds } }, select: { id: true } });
      const projectInvoiceIds = projectInvoices.map((invoice) => invoice.id);
      if (projectInvoiceIds.length > 0) {
        await prisma.receipt.deleteMany({ where: { invoiceId: { in: projectInvoiceIds } } });
      }
      await prisma.invoice.deleteMany({ where: { projectId: { in: sellerProjectIds } } });
      await prisma.project.deleteMany({ where: { id: { in: sellerProjectIds } } });
    }

    await prisma.client.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Client Delete Error:', error);
    res.status(500).json({ error: 'Delete failed', details: error.message });
  }
});

/**
 * 2.5. SOCIAL MEDIA LEADS
 */
app.get('/api/leads', authenticateToken, async (req, res) => {
  try {
    const { createdById, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const allowedSortFields = ['createdAt', 'fullName', 'createdByName'];
    const orderBy = allowedSortFields.includes(sortBy)
      ? { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' }
      : { createdAt: 'desc' };

    const where = {};
    if (createdById) where.createdById = String(createdById);

    const leads = await prisma.lead.findMany({ where, orderBy });
    res.json({ data: leads });
  } catch (error) {
    console.error('Lead fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/leads', authenticateToken, async (req, res) => {
  try {
    const {
      fullName,
      phone,
      presentLocation,
      dateToVisit,
      numSitesToVisit,
      locationToVisit,
      alreadyVisited,
      visitedSitesCount
    } = req.body;

    const cleanNumSites = Number(numSitesToVisit || 1);
    const normalizedLocationToVisit = locationToVisit && String(locationToVisit).trim()
      ? locationToVisit
      : 'Not Confirmed Yet';

    const missingFields = [];
    if (!fullName || !String(fullName).trim()) missingFields.push('fullName');
    if (!phone || !String(phone).trim()) missingFields.push('phone');
    if (!presentLocation || !String(presentLocation).trim()) missingFields.push('presentLocation');
    if (!dateToVisit || !String(dateToVisit).trim()) missingFields.push('dateToVisit');

    if (missingFields.length > 0) {
      console.warn('Lead create validation failed:', {
        missingFields,
        body: req.body
      });
      return res.status(400).json({
        error: `Missing required lead fields: ${missingFields.join(', ')}`
      });
    }

    const lead = await prisma.lead.create({
      data: {
        fullName,
        phone,
        presentLocation,
        dateToVisit: new Date(dateToVisit),
        numSitesToVisit: isNaN(cleanNumSites) ? 1 : cleanNumSites,
        locationToVisit: normalizedLocationToVisit,
        alreadyVisited: Boolean(alreadyVisited),
        visitedSitesCount: alreadyVisited ? Number(visitedSitesCount || 0) : 0,
        createdById: req.user.id,
        createdByName: req.user.name
      }
    });

    res.status(201).json({ data: lead });
  } catch (error) {
    console.error('Lead creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/leads/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const locationToVisit = req.body.locationToVisit && String(req.body.locationToVisit).trim()
      ? req.body.locationToVisit
      : 'Not Confirmed Yet';

    const updateData = {
      ...req.body,
      dateToVisit: req.body.dateToVisit ? new Date(req.body.dateToVisit) : undefined,
      numSitesToVisit: req.body.numSitesToVisit !== undefined ? Number(req.body.numSitesToVisit) : undefined,
      alreadyVisited: req.body.alreadyVisited !== undefined ? Boolean(req.body.alreadyVisited) : undefined,
      visitedSitesCount: req.body.visitedSitesCount !== undefined ? Number(req.body.visitedSitesCount) : undefined,
      locationToVisit
    };

    const lead = await prisma.lead.update({ where: { id }, data: updateData });
    res.json({ data: lead });
  } catch (error) {
    console.error('Lead update error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/leads/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.lead.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Lead delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 3. PROJECTS (Inventory Hub)
 */
app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await prisma.project.count();

    // Get paginated data
    const projects = await prisma.project.findMany({
        include: {
          seller: true,
          invoices: {
            include: {
              client: true,
              receipts: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      });
    const parsedProjects = projects.map((p) => ({
      ...p,
      details: typeof p.details === 'string' ? JSON.parse(p.details) : p.details
    }));
    res.json({ 
      data: parsedProjects, 
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/projects', authenticateToken, async (req, res) => {
  try {
    const project = await prisma.project.create({
      data: {
        ...req.body,
        // SQLITE FIX: Stringify JSON data
        details: JSON.stringify(req.body.details)
      }
    });
    res.status(201).json(project);
  } catch (error) { res.status(400).json({ error: error.message }); }
});

/**
 * 4. INVOICES (Sales)
 */
app.get('/api/invoices', authenticateToken, async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
        include: {
          client: true,
          project: true,
          receipts: true
        },
        orderBy: { invoiceDate: 'desc' }
      });
    res.json({ data: invoices, total: invoices.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/invoices', authenticateToken, async (req, res) => {
  const { clientId, amount, sqm, plotInfo, comments, projectId } = req.body;
  try {
    const invoiceNo = `INV-${Math.floor(10000 + Math.random() * 90000)}`;
    const newInvoice = await prisma.invoice.create({
      data: {
        clientId,
        amount: parseFloat(amount),
        sqm: parseFloat(sqm) || 0,
        plotInfo,
        comments,
        invoiceNo,
        projectId: projectId || null,
      },
    });
    res.status(201).json(newInvoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 5. RECEIPTS (Payments)
 */
app.get('/api/receipts', authenticateToken, async (req, res) => {
  try {
    const data = await prisma.receipt.findMany({ 
      include: { 
        client: true,
        invoice: {
          include: {
            project: true,
            receipts: true
          }
        }
      },
      orderBy: { createdAt: 'desc' } 
    });
    res.json({ data, total: data.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// server/index.js -> Update the Receipts POST route
// server/index.js -> Update POST /api/receipts
app.post('/api/receipts', authenticateToken, async (req, res) => {
  const { amount, clientId, invoiceId, buyerName, buyerPhone, paymentMethod, plotNumber, description, referenceCode } = req.body;

  try {
    const last = await prisma.receipt.findFirst({ orderBy: { createdAt: 'desc' } });
    let nextNum = 1;
    if (last && last.receiptNo.includes('-')) {
        nextNum = parseInt(last.receiptNo.split('-')[1]) + 1;
    }
    const receiptNo = `RCP-${nextNum.toString().padStart(4, '0')}`;

    const receipt = await prisma.receipt.create({
      data: {
        receiptNo,
        amount: parseFloat(amount),
        buyerName: String(buyerName),
        buyerPhone: String(buyerPhone || ""),
        paymentMethod: String(paymentMethod || "Cash"),
        plotNumber: String(plotNumber || ""),
        description: String(description || ""),
        referenceCode: String(referenceCode || ""),
        // CRITICAL Fix: Convert "" to null
        clientId: (clientId && clientId !== "") ? clientId : null,
        invoiceId: (invoiceId && invoiceId !== "") ? invoiceId : null,
      },
    });
    res.status(201).json(receipt);
  } catch (error) {
    console.error("Receipt Error:", error);
    res.status(400).json({ error: "Invalid Data", message: error.message });
  }
});

app.put('/api/receipts/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { amount, clientId, invoiceId, buyerName, buyerPhone, paymentMethod, plotNumber, description, referenceCode } = req.body;

  try {
    const receipt = await prisma.receipt.update({
      where: { id: id },
      data: {
        amount: parseFloat(amount),
        buyerName: String(buyerName),
        buyerPhone: String(buyerPhone || ""),
        paymentMethod: String(paymentMethod || "Cash"),
        plotNumber: String(plotNumber || ""),
        description: String(description || ""),
        referenceCode: String(referenceCode || ""),
        clientId: (clientId && clientId !== "") ? clientId : null,
        invoiceId: (invoiceId && invoiceId !== "") ? invoiceId : null,
      },
    });
    res.json(receipt);
  } catch (error) {
    console.error("Receipt Update Error:", error);
    res.status(400).json({ error: "Update failed", message: error.message });
  }
});

app.delete('/api/receipts/:id', authenticateToken, async (req, res) => {
    try {
      await prisma.receipt.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (error) { res.status(500).json({ error: "Delete failed" }); }
});


/**
 * 6. AGREEMENTS (Legal)
 */

// GET ALL AGREEMENTS
app.get('/api/agreements', authenticateToken, async (req, res) => {
  try {
    const data = await prisma.agreement.findMany({ 
      include: { client: true }, 
      orderBy: { createdAt: 'desc' } 
    });
    // SQLITE FIX: Parse clauses string back to JSON array for React
    const parsedAgreements = data.map(a => ({
        ...a,
        clauses: typeof a.clauses === 'string' ? JSON.parse(a.clauses) : a.clauses
    }));
    res.json({ data: parsedAgreements, total: data.length });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// CREATE AGREEMENT
// server/index.js -> POST Agreements

app.post('/api/agreements', authenticateToken, async (req, res) => {
  // 1. Destructure ONLY the fields that exist in your Prisma Model
  const { 
    clientId, type, plotNo, block, size, 
    price, priceWords, location, clauses 
  } = req.body;

  try {
    const agreement = await prisma.agreement.create({
      data: {
        clientId: String(clientId),
        type: String(type),
        plotNo: String(plotNo),
        block: block ? String(block) : null,
        size: String(size),
        price: parseFloat(price),
        priceWords: String(priceWords || ""),
        location: String(location || "Dodoma"),
        // SQLITE FIX: Always store as string if your schema says String 
        // OR as object if your schema says Json.
        clauses: typeof clauses === 'object' ? JSON.stringify(clauses) : clauses
      }
    });
    res.status(201).json(agreement);
  } catch (error) {
    console.error("❌ Agreement Save Error:", error);
    res.status(400).json({ error: "Validation Failed", details: error.message });
  }
});

// UPDATE AGREEMENT (Added for Edit Action)
app.put('/api/agreements/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { clauses, price, client, ...rest } = req.body; // Remove 'client' if it exists in body to avoid Prisma errors
    
    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        ...rest,
        price: parseFloat(price),
        clauses: typeof clauses === 'object' ? JSON.stringify(clauses) : clauses
      }
    });
    res.json(updated);
  } catch (error) { 
    console.error("Update Error:", error);
    res.status(400).json({ error: "Update failed" }); 
  }
});

// DELETE AGREEMENT (Added for Trash Action)
app.delete('/api/agreements/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.agreement.delete({ where: { id } });
    res.status(204).send();
  } catch (error) { res.status(500).json({ error: "Delete failed" }); }
});

/**
 * 7. DAILY REPORTS (Fixed camelCase)
 */
app.get('/api/reports', authenticateToken, async (req, res) => {
    try {
      const reports = await prisma.dailyReport.findMany({ orderBy: { createdAt: 'desc' } });
      res.json({ data: reports });
    } catch (error) { res.status(500).json({ error: error.message }); }
});
  
app.post('/api/reports', authenticateToken, async (req, res) => {
    try {
      const report = await prisma.dailyReport.create({
        data: {
            ...req.body,
            date: new Date(req.body.date),
            status: "submitted",
            workflowStatus: "pending_assistant",
            createdBy: req.user.name
        }
      });

      await createNotificationsForRole({
        role: 'Assistant Director',
        title: 'New Daily Report Submitted',
        message: `${req.user.name} submitted a daily report requiring your review.`,
        type: 'info'
      });

      res.status(201).json(report);
    } catch (error) {
      console.error('Report creation notification error:', error);
      res.status(400).json({ error: error.message });
    }
});

app.put('/api/reports/:id', authenticateToken, async (req, res) => {
  const { date, ...rest } = req.body;
  try {
    const updated = await prisma.dailyReport.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        date: date ? new Date(date) : undefined
      }
    });
    res.json(updated);
  } catch (error) { res.status(500).json({ error: "Update failed" }); }
});

app.delete('/api/reports/:id', authenticateToken, async (req, res) => {
  console.log(`DELETE /api/reports/${req.params.id}`);
  try {
    const deleted = await prisma.dailyReport.delete({
      where: { id: req.params.id }
    });
    res.json(deleted);
  } catch (error) {
    console.error('❌ REPORT DELETE ERROR:', error.message, 'id=', req.params.id);
    res.status(500).json({ error: 'Failed to delete report', details: error.message });
  }
});

/**
 * 8. REQUISITIONS (Finance)
 */
app.get('/api/requisitions', authenticateToken, async (req, res) => {
    try {
      const data = await prisma.requisition.findMany({ orderBy: { createdAt: 'desc' } });
      res.json({ data });
    } catch (error) { res.status(500).json({ error: error.message }); }
});
  
app.post('/api/requisitions', authenticateToken, async (req, res) => {
  const { amount, preparedByDate, projectName, ...rest } = req.body;
  try {
    const requisition = await prisma.requisition.create({
      data: {
        ...rest,
        amount: parseFloat(amount),
        preparedByDate: preparedByDate ? new Date(preparedByDate) : new Date(),
        status: "pending_assistant"
      }
    });

    await createNotificationsForRole({
      role: 'Assistant Director',
      title: 'New Requisition Submitted',
      message: `${req.user.name} created a requisition for ${projectName || 'a new project'} requiring your review.`,
      type: 'info'
    });

    res.status(201).json(requisition);
  } catch (error) {
    console.error('Requisition creation error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/requisitions/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  // 1. Destructure the incoming data
  const { role, userName, approved, amount, ...rest } = req.body;

  try {
    let updateData = {};

    // --- LOGIC A: If this is an APPROVAL action ---
    if (role && approved !== undefined) {
      if (!approved) {
        updateData = { status: 'rejected' };
      } else {
        const now = new Date();
        if (role === 'Assistant Director') {
          updateData = { 
            assistantName: userName, 
            assistantDate: now, 
            status: 'pending_director' 
          };
        } else if (role === 'General Director') {
          updateData = { 
            directorName: userName, 
            directorDate: now, 
            status: 'approved' 
          };
        }
      }
    } 
    // --- LOGIC B: If this is a normal EDIT action ---
    else {
      updateData = {
        ...rest,
        // Ensure we don't try to update 'id' or other meta fields
      };
      if (amount) updateData.amount = parseFloat(amount);
    }

    // 2. Execute the update with ONLY valid columns
    const updated = await prisma.requisition.update({
      where: { id },
      data: updateData
    });

    res.json(updated);
  } catch (error) {
    console.error("❌ REQUISITION UPDATE ERROR:", error.message);
    res.status(500).json({ error: "Update failed", details: error.message });
  }
});

/**
 * WORKFLOW APPROVAL ENDPOINTS
 */

// Reports Workflow
app.post('/api/reports/:id/submit', authenticateToken, async (req, res) => {
  try {
    const report = await prisma.dailyReport.update({
      where: { id: req.params.id },
      data: {
        workflowStatus: 'pending_assistant',
        submittedAt: new Date(),
        createdBy: req.user.name
      }
    });

    await createNotificationsForRole({
      role: 'Assistant Director',
      title: 'New Daily Report Submitted',
      message: `${req.user.name} submitted a daily report requiring your review.`,
      type: 'info'
    });

    res.json(report);
  } catch (error) {
    console.error('Report submit notification error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/reports/:id/approve-assistant', authenticateToken, async (req, res) => {
  if (req.user.role?.toLowerCase() !== 'assistant director') {
    return res.status(403).json({ error: 'Only Assistant Director can approve this stage' });
  }
  const { comments, approved } = req.body;
  try {
    if (approved) {
      const report = await prisma.dailyReport.update({
        where: { id: req.params.id },
        data: {
          workflowStatus: 'pending_director',
          assistantDirectorComments: comments,
          assistantDirectorApprovedAt: new Date()
        }
      });

      await createNotificationsForRole({
        role: 'General Director',
        title: 'Daily Report Forwarded',
        message: `${req.user.name} approved a daily report and forwarded it for General Director review.`,
        type: 'info'
      });

      const creator = await prisma.user.findFirst({ where: { fullName: report.createdBy } });
      if (creator) {
        await createNotification({
          userId: creator.id,
          title: 'Daily Report Approved by Assistant Director',
          message: `Your daily report was approved by ${req.user.name} and is now pending General Director review.`,
          type: 'success'
        });
      }

      res.json(report);
    } else {
      const report = await prisma.dailyReport.update({
        where: { id: req.params.id },
        data: {
          workflowStatus: 'rejected',
          assistantDirectorComments: comments
        }
      });

      const creator = await prisma.user.findFirst({ where: { fullName: report.createdBy } });
      if (creator) {
        await createNotification({
          userId: creator.id,
          title: 'Daily Report Rejected',
          message: `Your daily report was rejected by ${req.user.name}. Comments: ${comments || 'No comments provided'}.`,
          type: 'warning'
        });
      }

      res.json(report);
    }
  } catch (error) {
    console.error('Assistant report approval error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/reports/:id/approve-director', authenticateToken, async (req, res) => {
  if (req.user.role?.toLowerCase() !== 'general director') {
    return res.status(403).json({ error: 'Only General Director can approve this stage' });
  }
  const { comments, approved } = req.body;
  try {
    if (approved) {
      const report = await prisma.dailyReport.update({
        where: { id: req.params.id },
        data: {
          workflowStatus: 'final_approved',
          generalDirectorComments: comments,
          generalDirectorApprovedAt: new Date()
        }
      });

      const creator = await prisma.user.findFirst({ where: { fullName: report.createdBy } });
      if (creator) {
        await createNotification({
          userId: creator.id,
          title: 'Daily Report Approved',
          message: `Your daily report has been approved by ${req.user.name}.`,
          type: 'success'
        });
      }

      res.json(report);
    } else {
      const report = await prisma.dailyReport.update({
        where: { id: req.params.id },
        data: {
          workflowStatus: 'rejected',
          generalDirectorComments: comments
        }
      });

      const creator = await prisma.user.findFirst({ where: { fullName: report.createdBy } });
      if (creator) {
        await createNotification({
          userId: creator.id,
          title: 'Daily Report Rejected',
          message: `Your daily report was rejected by ${req.user.name}. Comments: ${comments || 'No comments provided'}.`,
          type: 'warning'
        });
      }

      res.json(report);
    }
  } catch (error) {
    console.error('General director report approval error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Requisitions Workflow
app.post('/api/requisitions/:id/submit', authenticateToken, async (req, res) => {
  try {
    const requisition = await prisma.requisition.update({
      where: { id: req.params.id },
      data: {
        status: 'pending_assistant'
      }
    });

    await createNotificationsForRole({
      role: 'Assistant Director',
      title: 'New Requisition Submitted',
      message: `${req.user.name} submitted a requisition requiring your review.`,
      type: 'info'
    });

    res.json(requisition);
  } catch (error) {
    console.error('Requisition submit notification error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/requisitions/:id/approve-assistant', authenticateToken, async (req, res) => {
  if (req.user.role?.toLowerCase() !== 'assistant director') {
    return res.status(403).json({ error: 'Only Assistant Director can approve this stage' });
  }
  const { comments, approved } = req.body;
  try {
    if (approved) {
      const requisition = await prisma.requisition.update({
        where: { id: req.params.id },
        data: {
          status: 'pending_director',
          assistantName: req.user.name,
          assistantDate: new Date()
        }
      });

      await createNotificationsForRole({
        role: 'General Director',
        title: 'Requisition Forwarded',
        message: `${req.user.name} approved a requisition and forwarded it to General Director.`,
        type: 'info'
      });

      const creator = await prisma.user.findFirst({ where: { fullName: requisition.preparedBy } });
      if (creator) {
        await createNotification({
          userId: creator.id,
          title: 'Requisition Approved by Assistant Director',
          message: `Your requisition was approved by ${req.user.name} and sent to General Director.`,
          type: 'success'
        });
      }

      res.json(requisition);
    } else {
      const requisition = await prisma.requisition.update({
        where: { id: req.params.id },
        data: {
          status: 'rejected',
          assistantName: req.user.name,
          assistantDate: new Date()
        }
      });

      const creator = await prisma.user.findFirst({ where: { fullName: requisition.preparedBy } });
      if (creator) {
        await createNotification({
          userId: creator.id,
          title: 'Requisition Rejected',
          message: `Your requisition was rejected by ${req.user.name}. Comments: ${comments || 'No comments provided'}.`,
          type: 'warning'
        });
      }

      res.json(requisition);
    }
  } catch (error) {
    console.error('Assistant requisition approval error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/requisitions/:id/approve-director', authenticateToken, async (req, res) => {
  if (req.user.role?.toLowerCase() !== 'general director') {
    return res.status(403).json({ error: 'Only General Director can approve this stage' });
  }
  const { comments, approved } = req.body;
  try {
    if (approved) {
      const requisition = await prisma.requisition.update({
        where: { id: req.params.id },
        data: {
          status: 'approved',
          directorName: req.user.name,
          directorDate: new Date()
        }
      });

      const creator = await prisma.user.findFirst({ where: { fullName: requisition.preparedBy } });
      if (creator) {
        await createNotification({
          userId: creator.id,
          title: 'Requisition Approved',
          message: `Your requisition has been approved by ${req.user.name}.`,
          type: 'success'
        });
      }

      res.json(requisition);
    } else {
      const requisition = await prisma.requisition.update({
        where: { id: req.params.id },
        data: {
          status: 'rejected',
          directorName: req.user.name,
          directorDate: new Date()
        }
      });

      const creator = await prisma.user.findFirst({ where: { fullName: requisition.preparedBy } });
      if (creator) {
        await createNotification({
          userId: creator.id,
          title: 'Requisition Rejected',
          message: `Your requisition was rejected by ${req.user.name}. Comments: ${comments || 'No comments provided'}.`,
          type: 'warning'
        });
      }

      res.json(requisition);
    }
  } catch (error) {
    console.error('General director requisition approval error:', error);
    res.status(400).json({ error: error.message });
  }
});


/**
 * 9. SETTINGS & USERS
 */
app.get('/api/settings', authenticateToken, async (req, res) => {
  let settings = await prisma.companySetting.findUnique({ where: { id: "global" } });
  if (!settings) settings = await prisma.companySetting.create({ data: { id: "global" } });
  res.json(settings);
});

app.put('/api/settings', authenticateToken, async (req, res) => {
  try {
    const updated = await prisma.companySetting.update({
      where: { id: "global" },
      data: req.body // Handles base64 logoUrl automatically
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update company profile" });
  }
});

app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        tinNumber: true,
        phone: true,
        avatar: true,
        bankName: true,
        bankAccountName: true,
        bankAccountNumber: true,
        kinName: true,
        kinRelation: true,
        kinPhone: true,
        isProfileComplete: true,
        securityQuestion: true,
        securityQuestions: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    const usersClean = users.map((user) => ({
      ...user,
      tinNumber: formatNidaOutput(user.tinNumber),
      securityQuestions: user.securityQuestions
        ? JSON.parse(user.securityQuestions)
        : user.securityQuestion
          ? [user.securityQuestion]
          : []
    }));
    res.json({ data: usersClean }); // TARGET: Must return an object with a 'data' key
  } catch (error) {
    res.status(500).json({ error: "Failed to load users" });
  }
});

app.put('/api/users/complete-profile/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const updates = { ...req.body };
    if (req.body.tinNumber !== undefined) {
      const normalizedTin = req.body.tinNumber ? normalizeNida(req.body.tinNumber) : null;
      if (req.body.tinNumber && !normalizedTin) {
        return res.status(400).json({ error: 'NIDA must be 20 digits in the format 19981226-59421-00001-20.' });
      }
      updates.tinNumber = normalizedTin;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...updates,
        isProfileComplete: true // Set flag to true
      }
    });
    res.json({ 
      user: { 
        id: updatedUser.id, 
        name: updatedUser.fullName, 
        role: updatedUser.role, 
        isProfileComplete: true 
      } 
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// DELETE User
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Could not delete user" });
  }
});

// server/index.js

// DELETE INVOICE
app.delete('/api/invoices/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.invoice.delete({ where: { id } });
    res.status(204).send(); // Success - No content
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});

// DELETE PROJECT
app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.project.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error("Project Delete Error:", error);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// --- UPDATE PROJECT (For Editing and Quick-Attach Map) ---
app.put('/api/projects/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { location, description, sellerId, details, mapUrl } = req.body;

  try {
    const updatedProject = await prisma.project.update({
      where: { id: id },
      data: {
        location: location,
        description: description,
        sellerId: sellerId,
        // SQLITE FIX: If details is an object, stringify it. 
        // If it's already a string, save as is.
        details: details ? (typeof details === 'object' ? JSON.stringify(details) : details) : undefined,
        mapUrl: mapUrl // This handles the Base64 image
      }
    });

    res.json(updatedProject);
  } catch (error) {
    console.error("Project Update Error:", error);
    res.status(400).json({ error: "Update failed", message: error.message });
  }
});

// server/index.js

// 1. UPDATED CLIENTS ROUTE (To include financial history)
app.get('/api/clients/reports', authenticateToken, async (req, res) => {
  try {
    const data = await prisma.client.findMany({
      include: {
        invoices: {
          include: {
            project: true,
            receipts: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. UPDATED PROJECTS ROUTE (To include seller and sales stats)
app.get('/api/projects/reports', authenticateToken, async (req, res) => {
  try {
    const data = await prisma.project.findMany({
      include: {
        seller: true,
        invoices: {
          include: { receipts: true }
        }
      },
      orderBy: { location: 'asc' }
    });
    
    // SQLITE FIX: Parse details string
    const parsed = data.map(p => ({
      ...p,
      details: typeof p.details === 'string' ? JSON.parse(p.details) : p.details
    }));
    
    res.json({ data: parsed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- SPECIALIZED ANALYTICS ROUTES ---

// 1. Master Buyers Ledger (Joins Clients -> Invoices -> Receipts)
app.get('/api/clients/reports', async (req, res) => {
  try {
    const data = await prisma.client.findMany({
      include: {
        invoices: {
          include: {
            project: true,
            receipts: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json({ data });
  } catch (error) {
    console.error("Master Ledger Error:", error);
    res.status(500).json({ error: "Failed to load master ledger data" });
  }
});

// --- REQUISITIONS ---
app.delete('/api/requisitions/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.requisition.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete requisition" });
  }
});

// Full Approval Logic
app.put('/api/requisitions/approve/:id', async (req, res) => {
  const { id } = req.params;
  const { role, userName, approved } = req.body;
  let updateData = { status: approved ? "" : "rejected" };

  if (approved) {
    if (role === 'Assistant Director') updateData = { assistantName: userName, assistantDate: new Date(), status: 'pending_director' };
    if (role === 'General Director') updateData = { directorName: userName, directorDate: new Date(), status: 'pending_finance' };
    if (role === 'Finance Manager') updateData = { financeName: userName, financeDate: new Date(), status: 'approved' };
  }

  const result = await prisma.requisition.update({ where: { id }, data: updateData });
  res.json(result);
});

// --- SMS SYSTEM ---
app.get('/api/sms', authenticateToken, async (req, res) => {
  try {
    const role = (req.user.role || '').toLowerCase();

    if (role === 'admin') {
      const data = await prisma.customerSMS.findMany({ orderBy: { createdAt: 'desc' } });
      return res.json({ data });
    }

    if (role === 'general director') {
      const data = await prisma.customerSMS.findMany({
        where: {
          OR: [
            { preparedBy: req.user.name },
            { writtenBy: req.user.name },
            { approvedBy: req.user.name }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.json({ data });
    }

    // Other users: only show public messages or those they prepared/wrote
    const data = await prisma.customerSMS.findMany({
      where: {
        OR: [
          { isPublic: true },
          { preparedBy: req.user.name },
          { writtenBy: req.user.name }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: "Failed to load SMS messages" });
  }
});

app.post('/api/sms', authenticateToken, async (req, res) => {
  const userRole = req.user.role?.toLowerCase();
  if (userRole !== 'staff' && userRole !== 'general director') {
    return res.status(403).json({ error: 'Only staff or General Director can create SMS messages' });
  }
  try {
    const fullName = String(req.body.fullName || (userRole === 'general director' ? 'General Director Message' : ''));
    const location = String(req.body.location || '');
    const phone = String(req.body.phone || (userRole === 'general director' ? '+255000000000' : ''));
    const category = String(req.body.category || 'Boost Adds');
    const message = String(req.body.message || '');

    const data = await prisma.customerSMS.create({ 
      data: {
        fullName,
        location,
        phone,
        category,
        message,
        preparedBy: req.user.name,
        status: userRole === 'general director' ? 'Written' : 'Draft',
        writtenBy: userRole === 'general director' ? req.user.name : undefined,
        isPublic: userRole === 'general director' ? false : undefined
      }
    });
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/sms/send-by-type', authenticateToken, async (req, res) => {
  try {
    const allowedRoles = ['staff', 'assistant director', 'admin'];
    const userRole = req.user.role?.toLowerCase();

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'You are not authorized to send gateway SMS.' });
    }

    const { type = 'all', category = 'General', message } = req.body;
    if (!message || message.toString().trim() === '') {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const clientType = type?.toString().toLowerCase();
    const where = {};
    if (clientType && clientType !== 'all') {
      where.type = clientType;
    }

    const clients = await prisma.client.findMany({
      where,
      select: {
        name: true,
        phone: true,
        city: true,
        state: true,
        address: true
      }
    });

    const recipients = clients.filter((client) => client.phone && client.phone.trim().length > 0);
    if (recipients.length === 0) {
      return res.status(404).json({ error: 'No customers found for selected type' });
    }

    const bulkData = recipients.map((client) => ({
      fullName: client.name,
      location: [client.city, client.state, client.address].filter(Boolean).join(', '),
      phone: client.phone,
      category,
      message,
      status: 'Sent',
      preparedBy: req.user.name,
      sentBy: req.user.name
    }));

    await prisma.customerSMS.createMany({ data: bulkData });

    res.json({
      sent: recipients.length,
      type: clientType,
      category,
      message,
      customers: recipients.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send SMS to a custom list of recipients (name, phone, location)
app.post('/api/sms/send-custom', authenticateToken, async (req, res) => {
  try {
    // Only General Director may compose via this flow; messages remain private until admin allows
    const userRole = (req.user.role || '').toLowerCase();
    if (userRole !== 'general director') return res.status(403).json({ error: 'Only General Director can compose these messages' });

    const { recipients, category = 'General', message } = req.body;
    if (!Array.isArray(recipients) || recipients.length === 0) return res.status(400).json({ error: 'Recipients array is required' });
    if (!message || String(message).trim() === '') return res.status(400).json({ error: 'Message content is required' });

    const validRecipients = recipients.filter(r => r && r.phone && String(r.phone).trim().length > 0);
    if (validRecipients.length === 0) return res.status(404).json({ error: 'No valid recipient phone numbers provided' });

    const bulkData = validRecipients.map(r => ({
      fullName: r.name || r.fullName || 'Unknown',
      location: r.location || r.city || '',
      phone: r.phone,
      category,
      message,
      status: 'Written',
      isPublic: false,
      preparedBy: req.user.name,
      writtenBy: req.user.name
    }));

    await prisma.customerSMS.createMany({ data: bulkData });

    res.json({ created: validRecipients.length, message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/sms/:id', authenticateToken, async (req, res) => {
  try {
    const currentSMS = await prisma.customerSMS.findUnique({ where: { id: req.params.id } });
    
    let updateData = {};
    // Only admin can toggle visibility
    if (typeof req.body.isPublic !== 'undefined' && req.user.role?.toLowerCase() === 'admin') {
      updateData.isPublic = !!req.body.isPublic;
    }
    // Allow other fields passed intentionally
    if (req.body.message) updateData.message = req.body.message;
    if (req.body.category) updateData.category = req.body.category;
    
    // Assistant Director - Write and set status to Written
    if (req.user.role?.toLowerCase() === 'assistant director' && currentSMS?.status === 'Draft') {
      updateData.writtenBy = req.user.name;
      updateData.status = 'Written';
    }
    // General Director - Approve and set status to Approved
    else if (req.user.role?.toLowerCase() === 'general director' && currentSMS?.status === 'Written') {
      updateData.approvedBy = req.user.name;
      updateData.status = 'Approved';
    }
    // Admin - Send and set status to Sent
    else if (req.user.role?.toLowerCase() === 'admin' && ['Written', 'Approved'].includes(currentSMS?.status)) {
      updateData.sentBy = req.user.name;
      updateData.status = 'Sent';
    }
    
    const data = await prisma.customerSMS.update({ where: { id: req.params.id }, data: updateData });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// server/index.js

app.put('/api/requisitions/:id', async (req, res) => {
  const { id } = req.params;
  
  // Destructure incoming data
  const { 
    amount, 
    preparedByDate, 
    assistantDate, 
    directorDate, 
    financeDate, 
    approvedByDate,
    ...rest 
  } = req.body;

  try {
    const updated = await prisma.requisition.update({
      where: { id: id },
      data: {
        ...rest,
        // Ensure numeric type
        amount: amount ? parseFloat(amount) : undefined,
        
        // --- CRITICAL DATE FIXES ---
        // Only convert to Date if the string is NOT empty, otherwise set to null
        preparedByDate: preparedByDate ? new Date(preparedByDate) : undefined,
        assistantDate: (assistantDate && assistantDate !== "") ? new Date(assistantDate) : null,
        directorDate: (directorDate && directorDate !== "") ? new Date(directorDate) : null,
        financeDate: (financeDate && financeDate !== "") ? new Date(financeDate) : null,
        approvedByDate: (approvedByDate && approvedByDate !== "") ? new Date(approvedByDate) : null,
      }
    });

    res.json(updated);
  } catch (error) {
    console.error("❌ Update Requisition Error:", error.message);
    res.status(500).json({ error: "Server crashed during update", details: error.message });
  }
});

app.delete('/api/sms/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.customerSMS.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete SMS message" });
  }
});

// 2. Project Performance Analysis (Joins Projects -> Invoices -> Receipts)
app.get('/api/projects/reports', authenticateToken, async (req, res) => {
  try {
    const data = await prisma.project.findMany({
      include: {
        seller: true,
        invoices: {
          include: { receipts: true }
        }
      },
      orderBy: { location: 'asc' }
    });
    
    // SQLite Fix: Parse the details string back into a JSON object for the frontend
    const parsedData = data.map(p => ({
      ...p,
      details: typeof p.details === 'string' ? JSON.parse(p.details) : p.details
    }));
    
    res.json({ data: parsedData });
  } catch (error) {
    console.error("Project Report Error:", error);
    res.status(500).json({ error: "Failed to load project analysis" });
  }
});

/**
 * 11. NOTIFICATIONS API
 */
app.post('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { userId, title, message, type = 'info' } = req.body;
    
    if (!userId || !title || !message) {
      return res.status(400).json({ error: 'userId, title, and message are required' });
    }

    const notification = await prisma.notification.create({
      data: { userId, title, message, type }
    });

    res.status(201).json({ data: notification });
  } catch (error) {
    console.error('Notification creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Invalid session user' });

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ data: notifications });
  } catch (error) {
    console.error('Notification fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notifications/unread/count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Invalid session user' });

    const count = await prisma.notification.count({
      where: { userId, isRead: false }
    });
    res.json({ count });
  } catch (error) {
    console.error('Notification count error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() }
    });
    res.json({ data: notification });
  } catch (error) {
    console.error('Notification read error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() }
    });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notification.delete({ where: { id } });
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Notification delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Server Listen
const PORT = process.env.PORT || 5000;

// If a built client app exists (Vite -> /client/dist), serve it as static files
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));

  // Serve index.html at root
  app.get('/', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  // SPA fallback for non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Bind to 0.0.0.0 so the server is reachable from other hosts (containers, VMs)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Highland API operational on port ${PORT}`);
});

// Lookup user by NIDA (tinNumber) - public endpoint used by forget-password flow
app.get('/api/users/nida/:nida', async (req, res) => {
  try {
    const nida = (req.params.nida || '').toString().trim();
    if (!nida) return res.status(400).json({ error: 'NIDA is required' });

    const user = await prisma.user.findFirst({ where: { tinNumber: nida } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const securityQuestions = user.securityQuestions
      ? JSON.parse(user.securityQuestions)
      : user.securityQuestion
        ? [user.securityQuestion]
        : [];

    return res.json({ id: user.id, securityQuestions });
  } catch (error) {
    console.error('Lookup by NIDA failed:', error);
    res.status(500).json({ error: 'Lookup failed' });
  }
});

// Lookup user by NIDA (tinNumber) for password recovery flow
app.get('/api/users/nida/:nida', async (req, res) => {
  const { nida } = req.params;
  try {
    const normalizedNida = normalizeNida(nida) || nida.trim();
    const user = await prisma.user.findFirst({ where: { OR: [{ tinNumber: normalizedNida }, { tinNumber: nida.trim() }] } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const securityQuestions = user.securityQuestions
      ? JSON.parse(user.securityQuestions)
      : user.securityQuestion
        ? [user.securityQuestion]
        : [];

    res.json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      tinNumber: formatNidaOutput(user.tinNumber),
      securityQuestions,
    });
  } catch (error) {
    console.error('NIDA lookup failed:', error);
    res.status(500).json({ error: 'Lookup failed' });
  }
});

// GET single user by id (full details)
app.get('/api/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        tinNumber: true,
        phone: true,
        avatar: true,
        bankName: true,
        bankAccountName: true,
        bankAccountNumber: true,
        kinName: true,
        kinRelation: true,
        kinPhone: true,
        isProfileComplete: true,
        securityQuestion: true,
        securityQuestions: true,
        createdAt: true
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const clean = {
      ...user,
      tinNumber: formatNidaOutput(user.tinNumber),
      securityQuestions: user.securityQuestions
        ? JSON.parse(user.securityQuestions)
        : user.securityQuestion
          ? [user.securityQuestion]
          : []
    };
    res.json({ user: clean });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load user' });
  }
});

// UPDATE user (admin or self) - update profile fields
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const allowed = ['fullName','email','role','status','tinNumber','phone','avatar','bankName','bankAccountName','bankAccountNumber','kinName','kinRelation','kinPhone','isProfileComplete'];
    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }

    if (req.body.tinNumber !== undefined) {
      const normalizedTin = req.body.tinNumber ? normalizeNida(req.body.tinNumber) : null;
      if (req.body.tinNumber && !normalizedTin) {
        return res.status(400).json({ error: 'NIDA must be 20 digits in the format 19981226-59421-00001-20.' });
      }
      updates.tinNumber = normalizedTin;
    }

    // Handle securityQuestions array specially
    if (req.body.securityQuestions !== undefined) {
      const q = Array.isArray(req.body.securityQuestions) ? req.body.securityQuestions : (typeof req.body.securityQuestions === 'string' && req.body.securityQuestions.trim() ? [req.body.securityQuestions] : []);
      updates.securityQuestions = q.length > 0 ? JSON.stringify(q) : null;
      updates.securityQuestion = q[0] || null;
    }

    const updated = await prisma.user.update({ where: { id }, data: updates });
    const clean = {
      ...updated,
      tinNumber: formatNidaOutput(updated.tinNumber),
      securityQuestions: updated.securityQuestions
        ? JSON.parse(updated.securityQuestions)
        : updated.securityQuestion
          ? [updated.securityQuestion]
          : []
    };
    res.json({ user: clean });
  } catch (error) {
    console.error('Update user failed:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// FORCE RESET user password (Admin only)
app.post('/api/users/:id/force-reset', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Only admins can force-reset other users' passwords
    const userRole = String(req.user?.role || '').toLowerCase();
    if (!req.user || (userRole !== 'admin' && userRole !== 'administrator')) {
      return res.status(403).json({ error: 'Only administrators can perform this action' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Allow client to provide a new password; otherwise generate a temporary one
    const provided = req.body && req.body.newPassword;
    const tempPassword = provided || `Temp@${Math.floor(100000 + Math.random() * 900000)}`;
    const hashed = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({ where: { id }, data: { password: hashed } });

    // Mark the user as required to set a new password on next login
    await prisma.user.update({ where: { id }, data: { status: 'must-reset' } });

    // Return the temporary password to the administrator so they can share it securely
    res.json({ message: 'Password reset successfully', newPassword: tempPassword });
  } catch (error) {
    console.error('Force reset failed:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});