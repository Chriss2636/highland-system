import React, { useState } from 'react';
import { Bell, X, Check, Trash2 } from 'lucide-react';
import { useNotificationsApi } from '../api/hooks';
import { formatDate } from '../utils';

export const NotificationsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { getNotifications, markAsRead, markAllAsRead, deleteNotification } = useNotificationsApi();
  const { data: notificationsData, isLoading } = getNotifications();
  const notifications = notificationsData?.data || [];

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTypeIcon = (type: string) => {
    const colors = {
      success: 'text-green-600',
      error: 'text-red-600',
      warning: 'text-yellow-600',
      info: 'text-blue-600'
    };
    return colors[type as keyof typeof colors] || colors.info;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end">
      <div className="bg-white w-full max-w-md h-screen shadow-lg flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Bell className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : notifications.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {notifications.map((notif: any) => (
                <div
                  key={notif.id}
                  className={`p-4 border-l-4 ${
                    notif.isRead
                      ? 'bg-gray-50 border-gray-300'
                      : `${getNotificationColor(notif.type)} border-red-600`
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold ${getTypeIcon(notif.type)}`}>
                          {notif.title}
                        </p>
                        {!notif.isRead && (
                          <span className="h-2 w-2 rounded-full bg-red-600"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatDate(notif.createdAt)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {!notif.isRead && (
                        <button
                          onClick={() => markAsRead.mutate(notif.id)}
                          className="p-1 hover:bg-white rounded transition"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4 text-green-600" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification.mutate(notif.id)}
                        className="p-1 hover:bg-white rounded transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p>No notifications yet</p>
            </div>
          )}
        </div>

        {notifications.some((n: any) => !n.isRead) && (
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => markAllAsRead.mutate()}
              className="w-full py-2 px-4 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
            >
              Mark All as Read
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
