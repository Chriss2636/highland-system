import { useAuth } from '../context/AuthContext';

export const usePermissions = () => {
  const { user } = useAuth();

  // Normalize role strings to handle variations coming from the server
  const rawRole = user?.role || '';
  const cleaned = rawRole.toLowerCase().replace(/[_\-]/g, ' ').trim();
  let role = cleaned;

  if (cleaned.includes('finance')) {
    role = 'financial manager';
  } else if (cleaned.includes('general')) {
    role = 'general director';
  } else if (cleaned.includes('assistant')) {
    role = 'assistant director';
  } else if (cleaned.includes('admin')) {
    role = 'admin';
  } else if (cleaned.includes('client')) {
    role = 'client';
  } else if (cleaned.includes('staff')) {
    role = 'staff';
  }

  /**
   * Check if user can view a specific resource
   */
  const canView = (resource: string) => {
    if (role === 'admin') return true;
    
    if (role === 'general director') {
      // General Director can view all core management pages, including analytics and social media leads.
      return ['projects', 'invoices', 'clients', 'receipts', 'agreements', 'analytics', 'reports', 'requisitions', 'dashboard', 'financial', 'leads'].includes(resource);
    }
    
    if (role === 'client') {
      // Client: Clients, Receipts, Agreements, Analytics (full) + Reports & Requisitions (limited)
      return ['clients', 'receipts', 'agreements', 'analytics', 'reports', 'requisitions', 'dashboard', 'financial'].includes(resource);
    }
    
    if (role === 'assistant director') {
      // Assistant Director: All pages except settings
      return ['projects', 'invoices', 'clients', 'receipts', 'agreements', 'analytics', 'reports', 'requisitions', 'dashboard', 'financial', 'leads'].includes(resource);
    }
    
    if (role === 'financial manager') {
      return ['dashboard', 'projects', 'invoices', 'clients', 'receipts', 'agreements', 'analytics', 'reports', 'requisitions', 'financial', 'leads'].includes(resource);
    }
    
    if (role === 'staff') {
      // Staff: View only clients, projects, invoices, receipts, agreements, analytics + full control on reports and requisitions
      return ['clients', 'projects', 'invoices', 'receipts', 'agreements', 'analytics', 'reports', 'requisitions', 'dashboard', 'financial', 'leads'].includes(resource);
    }
    
    return false;
  };

  /**
   * Check if user can create a resource
   */
  const canCreate = (resource: string) => {
    if (role === 'admin') return true;
    
    if (role === 'general director') {
      return ['clients', 'receipts', 'agreements', 'leads'].includes(resource);
    }
    
    if (role === 'client') {
      return ['clients', 'receipts', 'agreements'].includes(resource);
    }
    
    if (role === 'assistant director') {
      return ['projects', 'invoices', 'reports', 'requisitions', 'leads'].includes(resource);
    }
    
    if (role === 'financial manager') {
      return ['projects', 'invoices', 'receipts', 'reports', 'requisitions', 'financial', 'leads'].includes(resource);
    }
    
    if (role === 'staff') {
      return ['reports', 'requisitions', 'leads'].includes(resource);
    }
    
    return false;
  };

  /**
   * Check if user can edit a resource
   */
  const canEdit = (resource: string) => {
    if (role === 'admin') return true;
    
    if (role === 'general director') {
      return ['clients', 'receipts', 'agreements', 'leads'].includes(resource);
    }
    
    if (role === 'client') {
      return ['clients', 'receipts', 'agreements'].includes(resource);
    }
    
    if (role === 'assistant director') {
      return ['projects', 'invoices', 'reports', 'requisitions', 'leads'].includes(resource);
    }
    
    if (role === 'financial manager') {
      return ['projects', 'invoices', 'receipts', 'reports', 'requisitions', 'financial', 'leads'].includes(resource);
    }
    
    if (role === 'staff') {
      return ['reports', 'requisitions', 'leads'].includes(resource);
    }
    
    return false;
  };

  /**
   * Check if user can delete a resource
   */
  const canDelete = (resource: string) => {
    if (role === 'admin') return true;

    if (role === 'general director') {
      return ['reports', 'agreements', 'clients', 'receipts'].includes(resource);
    }

    if (role === 'assistant director') {
      return ['reports', 'requisitions', 'leads'].includes(resource);
    }

    if (role === 'financial manager') {
      return ['reports', 'requisitions', 'financial', 'leads'].includes(resource);
    }

    if (role === 'staff') {
      return ['reports', 'requisitions', 'leads'].includes(resource);
    }

    return false;
  };

  /**
   * Check if user can approve a resource
   * - Admin: can approve everything
   * - Assistant Director: can approve reports and requisitions
   * - Client: limited approval after Assistant Director (can't initiate)
   * - General Director: read-only
   */
  const canApprove = (resource: string) => {
    if (role === 'admin') return true;
    
    if (role === 'assistant director') {
      return ['reports', 'requisitions'].includes(resource);
    }
    
    if (role === 'general director') {
      return ['reports', 'requisitions'].includes(resource);
    }
    
    if (role === 'financial manager') {
      return ['reports', 'requisitions', 'financial'].includes(resource);
    }
    
    if (role === 'client') {
      // Client can view and comment on reports/requisitions, but limited approval after assistant director
      return false; // Can't initiate approval
    }
    
    return false;
  };

  /**
   * Check if user can comment on reports/requisitions
   */
  const canComment = (resource: string) => {
    if (role === 'admin') return true;
    
    if (role === 'assistant director') {
      return ['reports', 'requisitions'].includes(resource);
    }
    
    if (role === 'financial manager') {
      return ['reports', 'requisitions', 'financial'].includes(resource);
    }
    
    if (role === 'client') {
      return ['reports', 'requisitions'].includes(resource);
    }
    
    if (role === 'staff') {
      return ['reports', 'requisitions'].includes(resource);
    }
    
    return false;
  };

  /**
   * Check if user has access to settings
   */
  const canAccessSettings = () => {
    return role === 'admin';
  };

  /**
   * Get allowed resources for this user
   */
  const getAllowedResources = () => {
    if (role === 'admin') {
      return ['dashboard', 'projects', 'invoices', 'clients', 'receipts', 'agreements', 'analytics', 'reports', 'requisitions', 'settings', 'financial', 'leads'];
    }

    if (role === 'financial manager') {
      return ['dashboard', 'projects', 'invoices', 'clients', 'receipts', 'agreements', 'analytics', 'reports', 'requisitions', 'financial', 'leads'];
    }
    if (role === 'general director') {
      return ['dashboard', 'projects', 'invoices', 'clients', 'receipts', 'agreements', 'analytics', 'reports', 'requisitions', 'leads'];
    }
    if (role === 'client') {
      return ['dashboard', 'clients', 'receipts', 'agreements', 'analytics', 'reports', 'requisitions'];
    }
    if (role === 'assistant director') {
      return ['dashboard', 'projects', 'invoices', 'clients', 'receipts', 'agreements', 'analytics', 'reports', 'requisitions', 'leads'];
    }
    if (role === 'staff') {
      return ['dashboard', 'clients', 'projects', 'invoices', 'receipts', 'agreements', 'analytics', 'reports', 'requisitions', 'leads'];
    }
    return ['dashboard'];
  };

  return {
    canView,
    canCreate,
    canEdit,
    canDelete,
    canApprove,
    canComment,
    canAccessSettings,
    getAllowedResources,
    role
  };
};