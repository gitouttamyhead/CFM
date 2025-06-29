// Email Notification System for CFM Insights
// This file handles sending email notifications when insights are created or updated
//
// IMPORTANT: EmailJS free plan has limitations with recipient verification.
// For production use, consider upgrading to EmailJS Pro or using a different email service.
// Alternative solutions: SendGrid, Mailgun, or Firebase Functions with Nodemailer

// EmailJS configuration
const EMAILJS_CONFIG = {
    serviceId: 'service_ug84ky3', // Replace with your EmailJS service ID
    templateId: 'template_0e5qk9b', // Replace with your template ID
    userId: 'GAP4HMvMHFU4_vmj_' // Replace with your EmailJS user ID
};

// Alternative email service configuration (for future use)
const ALTERNATIVE_EMAIL_CONFIG = {
    sendGridApiKey: 'YOUR_SENDGRID_API_KEY', // Do not commit real keys!
    fromEmail: 'comefollowmeapp@gmail.com',
    fromName: 'Come Follow Me Insights'
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

// Replace sendInsightNotification with Netlify function version
async function sendInsightNotification(insightData, recipientEmails, isNewInsight = true) {
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

        // Send individual emails to each recipient using the Netlify function
        const results = [];
        for (const email of recipientEmails) {
            try {
                const htmlContent = createEmailHTML(insightData, insightUrl, isNewInsight);
                const subject = `New Insight: ${insightData.title}`;
                const response = await fetch('/.netlify/functions/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ to: email, subject, html: htmlContent })
                });
                const data = await response.json();
                console.log('Netlify function response:', data);
                if (data.success) {
                    results.push({ email, success: true });
                } else {
                    results.push({ email, success: false, error: data.error });
                }
            } catch (error) {
                results.push({ email, success: false, error: error.message });
            }
        }

        // Log the notification in Firestore
        await logEmailNotification(insightData.id, recipientEmails, isNewInsight);

        // Count successful sends
        const successfulSends = results.filter(r => r.success).length;
        const failedSends = results.filter(r => !r.success);

        if (failedSends.length > 0) {
            console.warn('Some emails failed to send:', failedSends);
        }

        return {
            success: successfulSends > 0,
            message: `Sent ${successfulSends} of ${recipientEmails.length} emails successfully`,
            results: results
        };
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
            // Show detailed results
            let message = result.message + '\n\n';
            
            if (result.results) {
                const successful = result.results.filter(r => r.success);
                const failed = result.results.filter(r => !r.success);
                
                if (successful.length > 0) {
                    message += '✅ Successfully sent to:\n';
                    successful.forEach(r => message += `  • ${r.email}\n`);
                }
                
                if (failed.length > 0) {
                    message += '\n❌ Failed to send to:\n';
                    failed.forEach(r => message += `  • ${r.email} (${r.error})\n`);
                }
            }
            
            if (result.note) {
                message += '\n\n' + result.note;
            }
            
            // Add troubleshooting information
            message += '\n\n💡 Troubleshooting:';
            message += '\n• Check your EmailJS dashboard for actual delivery status';
            message += '\n• Verify recipient emails in EmailJS: Dashboard → Account → Email Verification';
            message += '\n• Check spam/junk folders';
            message += '\n• Ensure your EmailJS service is properly configured';
            
            alert(message);
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

// Test EmailJS configuration
async function testEmailJSConfiguration() {
    if (typeof emailjs === 'undefined') {
        console.error('EmailJS not available');
        alert('EmailJS SDK not loaded. Please check your script tags.');
        return;
    }

    try {
        console.log('Testing EmailJS configuration...');
        console.log('Service ID:', EMAILJS_CONFIG.serviceId);
        console.log('Template ID:', EMAILJS_CONFIG.templateId);
        console.log('User ID:', EMAILJS_CONFIG.userId);

        // Test with a simple template
        const testParams = {
            to_email: 'test@example.com',
            insight_title: 'Test Email',
            insight_summary: 'This is a test email to verify EmailJS configuration.',
            insight_category: 'Test',
            insight_url: 'https://example.com',
            action_type: 'test',
            creator_name: 'Test User',
            created_date: new Date().toLocaleDateString()
        };

        console.log('Sending test email...');
        const response = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templateId,
            testParams
        );

        console.log('Test email response:', response);
        alert('EmailJS configuration test completed. Check console for details.');
        
    } catch (error) {
        console.error('EmailJS configuration test failed:', error);
        alert(`EmailJS configuration test failed: ${error.message}\n\nCheck console for details.`);
    }
}

// Initialize the email notification system
document.addEventListener('DOMContentLoaded', function() {
    initEmailJS();
    
    // Add test function to window for easy access
    window.testEmailJS = testEmailJSConfiguration;
});

// Export functions for use in other files
window.EmailNotifications = {
    sendInsightNotification,
    showEmailNotificationModal,
    addEmailNotificationButton,
    getAllUsers,
    testEmailJSConfiguration
};

// Send email using SendGrid (alternative to EmailJS)
async function sendEmailWithSendGrid(recipientEmail, subject, htmlContent) {
    if (!ALTERNATIVE_EMAIL_CONFIG.sendGridApiKey) {
        throw new Error('SendGrid API key not configured');
    }

    const emailData = {
        personalizations: [{
            to: [{ email: recipientEmail }]
        }],
        from: {
            email: ALTERNATIVE_EMAIL_CONFIG.fromEmail,
            name: ALTERNATIVE_EMAIL_CONFIG.fromName
        },
        subject: subject,
        content: [{
            type: 'text/html',
            value: htmlContent
        }]
    };

    try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ALTERNATIVE_EMAIL_CONFIG.sendGridApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`SendGrid error: ${errorData.errors?.[0]?.message || response.statusText}`);
        }

        return { success: true, messageId: response.headers.get('x-message-id') };
    } catch (error) {
        console.error('SendGrid error:', error);
        throw error;
    }
}

// Create HTML email content
function createEmailHTML(insightData, insightUrl, isNewInsight) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #3498db; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
                .insight-title { font-size: 24px; color: #2c3e50; margin-bottom: 10px; }
                .insight-summary { background: white; padding: 15px; border-left: 4px solid #3498db; margin: 15px 0; }
                .cta-button { display: inline-block; background: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Come Follow Me - New Insight Available</h1>
            </div>
            <div class="content">
                <p>Hello!</p>
                <p>${insightData.creatorName || 'A team member'} has ${isNewInsight ? 'created' : 'updated'} a new insight in the <strong>${insightData.category}</strong> category.</p>
                <div class="insight-title">${insightData.title}</div>
                <div class="insight-summary">
                    <strong>Summary:</strong><br>
                    ${insightData.summary || insightData.content.substring(0, 200) + '...'}
                </div>
                <p>Click the button below to view the full insight:</p>
                <a href="${insightUrl}" class="cta-button">View Insight</a>
                <p>This insight was ${isNewInsight ? 'created' : 'updated'} on ${new Date().toLocaleDateString()}.</p>
                <div class="footer">
                    <p>You received this email because you're a member of the Come Follow Me insights community.</p>
                    <p>If you have any questions, please contact your administrator.</p>
                </div>
            </div>
        </body>
        </html>
    `;
} 