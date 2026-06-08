import React, { useState } from 'react';
import { Button } from './Button';

export interface FormField {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
}

interface FormProps {
  fields: FormField[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
  submitLabel?: string;
}

export const Form = ({ fields, onSubmit, onCancel, loading, submitLabel }: FormProps) => {
  const [formData, setFormData] = useState<any>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.name} className={field.name === 'address' ? 'col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
            {field.type === 'select' ? (
              <select
                className="w-full border rounded-lg p-2"
                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
              >
                <option value="">Select...</option>
                {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            ) : (
              <input
                type={field.type || 'text'}
                className="w-full border rounded-lg p-2"
                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                required={field.required}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end space-x-3 mt-6">
        <Button variant="secondary" onClick={onCancel} type="button">Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Saving...' : submitLabel}</Button>
      </div>
    </form>
  );
};