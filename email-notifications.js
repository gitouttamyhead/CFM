// Email Notification System for CFM Insights
// This file handles sending email notifications when insights are created or updated

// EmailJS configuration
const EMAILJS_CONFIG = {
    serviceId: 'YOUR_EMAILJS_SERVICE_ID', // Replace with your EmailJS service ID
    templateId: 'cfm_insight_notification', // Replace with your template ID
    userId: 'YOUR_EMAILJS_USER_ID' // Replace with your EmailJS user ID
};

// Initialize EmailJS
function initEmailJS() {
    if (typeof emailjs !== 'undefined') {
        emailjs.init(EMAILJS_CONFIG.userId);
    } else {
        console.warn('EmailJS not loaded. Please include the EmailJS SDK.');
    }
}

// Get all users for notification selection
async function getAllUsers() {
    try {
        const snapshot = await firebase.firestore().collection('users').get();
        const users = [];
        snapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.email) {
                users.push({
                    id: doc.id,
                    email: userData.email,
                    name: userData.name || userData.email.split('@')[0],
                    role: userData.role || 'user'
                });
            }
        });
        return users;
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
}

// Send email notification
async function sendInsightNotification(insightData, recipientEmails, isNewInsight = true) {
    if (typeof emailjs === 'undefined') {
        console.error('EmailJS not available');
        return { success: false, error: 'EmailJS not available' };
    }

    if (!recipientEmails || recipientEmails.length === 0) {
        return { success: false, error: 'No recipients specified' };
    }

    try {
        // Create the insight URL based on the collection
        let insightUrl = '';
        if (insightData.category === 'Gospel Topics') {
            insightUrl = `${window.location.origin}/insight-gospel.html?id=${insightData.id}&collection=gospelInsights`;
        } else if (insightData.category === 'Other') {
            insightUrl = `${window.location.origin}/insight-other.html?id=${insightData.id}&collection=otherInsights`;
        } else {
            insightUrl = `${window.location.origin}/insight-scripture.html?id=${insightData.id}&collection=insights`;
        }

        // Prepare email template parameters
        const templateParams = {
            to_email: recipientEmails.join(','),
            insight_title: insightData.title,
            insight_summary: insightData.summary || insightData.content.substring(0, 200) + '...',
            insight_category: insightData.category,
            insight_url: insightUrl,
            action_type: isNewInsight ? 'created' : 'updated',
            creator_name: insightData.creatorName || 'A team member',
            created_date: new Date().toLocaleDateString()
        };

        // Send email using EmailJS
        const response = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templateId,
            templateParams
        );

        // Log the notification in Firestore
        await logEmailNotification(insightData.id, recipientEmails, isNewInsight);

        return { success: true, messageId: response.text };
    } catch (error) {
        console.error('Error sending email notification:', error);
        return { success: false, error: error.message };
    }
}

// Log email notification in Firestore
async function logEmailNotification(insightId, recipientEmails, isNewInsight) {
    try {
        await firebase.firestore().collection('emailNotifications').add({
            insightId: insightId,
            recipientEmails: recipientEmails,
            sentAt: firebase.firestore.FieldValue.serverTimestamp(),
            type: isNewInsight ? 'new_insight' : 'updated_insight',
            status: 'sent'
        });
    } catch (error) {
        console.error('Error logging email notification:', error);
    }
}

// Create user selection modal for email notifications
function createEmailNotificationModal() {
    const modal = document.createElement('div');
    modal.id = 'emailNotificationModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <h2>Send Email Notification</h2>
            <p>Select users to notify about this insight:</p>
            
            <div style="margin: 20px 0;">
                <label style="display: block; margin-bottom: 10px;">
                    <input type="checkbox" id="selectAllUsers" style="margin-right: 8px;">
                    Select All Users
                </label>
            </div>
            
            <div id="userSelectionList" style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; padding: 10px;">
                <p>Loading users...</p>
            </div>
            
            <div style="margin-top: 20px;">
                <button type="button" class="btn" id="sendNotificationBtn" style="background: #27ae60;">Send Notification</button>
                <button type="button" class="btn" id="cancelNotificationBtn" style="background: #95a5a6;">Cancel</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    return modal;
}

// Show email notification modal
async function showEmailNotificationModal(insightData, isNewInsight = true) {
    const modal = document.getElementById('emailNotificationModal') || createEmailNotificationModal();
    const userList = document.getElementById('userSelectionList');
    const selectAllCheckbox = document.getElementById('selectAllUsers');
    const sendBtn = document.getElementById('sendNotificationBtn');
    const cancelBtn = document.getElementById('cancelNotificationBtn');

    // Load users
    const users = await getAllUsers();
    
    if (users.length === 0) {
        userList.innerHTML = '<p>No users found to notify.</p>';
        return;
    }

    // Populate user list
    userList.innerHTML = users.map(user => `
        <label style="display: block; margin-bottom: 8px; padding: 5px;">
            <input type="checkbox" class="user-checkbox" value="${user.email}" data-user-id="${user.id}" style="margin-right: 8px;">
            <strong>${user.name}</strong> (${user.email}) - ${user.role}
        </label>
    `).join('');

    // Handle select all functionality
    selectAllCheckbox.addEventListener('change', function() {
        const checkboxes = userList.querySelectorAll('.user-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
    });

    // Handle send notification
    sendBtn.addEventListener('click', async function() {
        const selectedEmails = Array.from(userList.querySelectorAll('.user-checkbox:checked'))
            .map(checkbox => checkbox.value);

        if (selectedEmails.length === 0) {
            alert('Please select at least one user to notify.');
            return;
        }

        sendBtn.textContent = 'Sending...';
        sendBtn.disabled = true;

        const result = await sendInsightNotification(insightData, selectedEmails, isNewInsight);

        if (result.success) {
            alert(`Email notification sent successfully to ${selectedEmails.length} user(s)!`);
            modal.style.display = 'none';
        } else {
            alert(`Failed to send email notification: ${result.error}`);
        }

        sendBtn.textContent = 'Send Notification';
        sendBtn.disabled = false;
    });

    // Handle cancel
    cancelBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });

    // Show modal
    modal.style.display = 'block';
}

// Add email notification button to insight cards
function addEmailNotificationButton(insightCard, insightData) {
    const emailBtn = document.createElement('button');
    emailBtn.className = 'btn';
    emailBtn.style.background = '#e67e22';
    emailBtn.style.marginLeft = '5px';
    emailBtn.innerHTML = '<svg viewBox="0 0 24 24" style="width: 16px; height: 16px; margin-right: 5px;"><path fill="currentColor" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>Resend Email';
    emailBtn.onclick = () => showEmailNotificationModal(insightData, false);

    // Find the insight actions container and add the email button
    const actionsContainer = insightCard.querySelector('.insight-actions');
    if (actionsContainer) {
        actionsContainer.appendChild(emailBtn);
    }
}

// Initialize the email notification system
document.addEventListener('DOMContentLoaded', function() {
    initEmailJS();
});

// Export functions for use in other files
window.EmailNotifications = {
    sendInsightNotification,
    showEmailNotificationModal,
    addEmailNotificationButton,
    getAllUsers
}; 