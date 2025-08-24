/**
 * Utility functions for creating and managing notifications
 */

const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Creates a notification for specific user profiles
 * @param {string[]} profiles - Array of user profiles to notify (e.g., ['UFF', 'TRATT'])
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} options - Optional parameters
 * @param {string} options.type - Notification type (info, success, warning, error)
 * @param {string} options.priority - Priority (low, medium, high, urgent)
 * @param {Object} options.relatedEntity - Related entity information
 * @param {string} options.actionUrl - URL for navigation
 * @param {Date} options.expiresAt - Expiration date
 */
async function createNotificationForProfiles(profiles, title, message, options = {}) {
  try {
    const {
      type = 'info',
      priority = 'medium',
      relatedEntity = null,
      actionUrl = null,
      expiresAt = null
    } = options;

    // Create a single notification with multiple target profiles
    const profileTarget = profiles.length === 1 ? profiles[0] : profiles;
    
    const notification = await Notification.createNotification({
      userId: null, // Generic notification not tied to specific user
      username: null, // Will be filtered by profile in API
      profileTarget: profileTarget, // Can be string (single) or array (multiple)
      title,
      message,
      type,
      priority,
      relatedEntity,
      actionUrl,
      expiresAt
    });

    console.log(`Created 1 notification for profiles: ${profiles.join(', ')}`);
    return [notification];

  } catch (error) {
    console.error('Error creating notifications for profiles:', error);
    throw error;
  }
}

/**
 * Creates a notification for a specific component status change
 * @param {Object} component - The component that changed status
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 * @param {string} changedBy - Username who made the change
 */
async function createStatusChangeNotification(component, oldStatus, newStatus, changedBy) {
  try {
    const { BASE_STATUSES } = require('../../shared/statusConfig.js');
    
    // Only create notifications for specific status changes
    let shouldNotify = false;
    let profiles = [];
    let title = '';
    let message = '';
    let priority = 'medium';

    // Status change to "pronto per spedizione" (5)
    if (newStatus === BASE_STATUSES.PRONTO_CONSEGNA) {
      shouldNotify = true;
      profiles = ['UFF'];
      title = 'Componente pronto per spedizione';
      message = `Il componente ${component.descrizioneComponente || component._id} della commessa ${component.commessaCode} è ora pronto per la spedizione.`;
      priority = 'high';
    }
    
    // Status change to "costruito" (3) with treatments
    else if (newStatus === BASE_STATUSES.COSTRUITO && component.trattamenti && component.trattamenti.length > 0) {
      shouldNotify = true;
      profiles = ['UFF', 'TRATT'];
      title = 'Componente costruito con trattamenti';
      message = `Il componente ${component.descrizioneComponente || component._id} della commessa ${component.commessaCode} è stato costruito e richiede trattamenti: ${component.trattamenti.join(', ')}.`;
      priority = 'high';
    }

    if (!shouldNotify) {
      return [];
    }

    // Create the notifications
    const notifications = await createNotificationForProfiles(
      profiles,
      title,
      message,
      {
        type: 'info',
        priority,
        relatedEntity: {
          type: 'component',
          id: component._id,
          name: component.descrizioneComponente || `Componente ${component.commessaCode}`
        },
        actionUrl: `/lavorazioni?componentId=${component._id}`
      }
    );

    return notifications;

  } catch (error) {
    console.error('Error creating status change notification:', error);
    throw error;
  }
}

module.exports = {
  createNotificationForProfiles,
  createStatusChangeNotification
};