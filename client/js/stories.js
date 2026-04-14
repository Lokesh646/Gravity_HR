const STORIES_STATE = {
    wishes: {
        birthday: [
            "Wishing you a fantastic birthday and a year filled with success! 🎉",
            "Happy Birthday! May your day be as wonderful as your contribution to this team. 🎂",
            "Cheers to another year of great work! Have a brilliant birthday. 🎊",
            "Happy Birthday, {name}! Wishing you joy, health, and prosperity today and always. ✨",
            "Sending you the warmest birthday wishes for a year of growth and happiness. 🎈",
            "Happy Birthday! Thank you for your hard work and dedication. Enjoy your special day! 🥳",
            "Wishing you all the best on your birthday! Here's to another amazing year ahead. 🌟",
            "Happy Birthday! May all your dreams and wishes come true this year. 🎁",
            "Cheers to you on your birthday! Your positive energy makes the workplace better. 🥂",
            "Happy Birthday, {name}! Hoping your day is filled with celebration and joy. 🍰",
            "Warmest wishes on your birthday! Thank you for being such a great team player. 🏆",
            "Happy Birthday! May this year bring you new opportunities and continued success. 🚀",
            "Wishing you a very Happy Birthday! Enjoy the celebrations, you deserve it. 🍾",
            "Happy Birthday! Your dedication to excellence is truly appreciated. 💎",
            "Sending birthday cheer your way! Have a fantastic day surrounded by loved ones. 🎉",
            "Happy Birthday, {name}! May your year be filled with exciting new challenges and victories. 🎯",
            "Wishing you a wonderful birthday! Thank you for always bringing your best to the table. ✨",
            "Happy Birthday! Here's to health, happiness, and achieving all your goals. 🌈",
            "Cheers to {name} on their birthday! May your day be as awesome as you are. 😎",
            "Happy Birthday! We are so lucky to have you on our team. Have a great one! 🍀",
            "Wishing you the happiest of birthdays! May this year be your best one yet. 🌟",
            "Happy Birthday! Your hard work doesn't go unnoticed. Enjoy your special day! 🎊",
            "Sending you best wishes on your birthday! Have a spectacular day. 🎆",
            "Happy Birthday, {name}! May your day be filled with laughter and good times. 😄",
            "Wishing you a brilliant birthday! Thank you for your constant support and hard work. 🤝",
            "Happy Birthday! May the year ahead be full of professional and personal growth. 📈",
            "Cheers to another fantastic year! Happy Birthday to an amazing colleague. 🥂",
            "Happy Birthday! Hoping your special day brings you everything your heart desires. ❤️",
            "Wishing you a very Happy Birthday! You bring so much value to our company. 💎",
            "Happy Birthday, {name}! Have a fun-filled day and a wonderful year ahead. 🎈",
            "Sending birthday smiles your way! Thank you for all that you do. 😊",
            "Happy Birthday! May your day be beautiful and your year be an absolute masterpiece. 🎨",
            "Wishing you a fantastic birthday! Your passion for your work is truly inspiring. 🔥",
            "Happy Birthday! Here's to celebrating you and all your wonderful accomplishments. 🏆",
            "Cheers to your birthday! May it be the start of a year filled with good luck, health, and happiness. 🍀",
            "Happy Birthday, {name}! Sending you good vibes and best wishes for the year ahead. ✌️",
            "Wishing you the most joyous of birthdays! Enjoy every moment of your special day. 🎉",
            "Happy Birthday! Thank you for being an exceptional part of our team. 🌟",
            "Sending warmest birthday greetings! May your day be as brilliant as your ideas. 💡",
            "Happy Birthday! Here's to another year of laughing together and achieving great things. 😂",
            "Wishing you a very Happy Birthday, {name}! May your future be as bright as your smile. ✨",
            "Happy Birthday! Your positive attitude is contagious. Hope you have a great day! 😁",
            "Cheers to you on your special day! Happy Birthday and best wishes for the coming year. 🍾",
            "Happy Birthday! May your day be filled with sweet moments and big celebrations. 🎂",
            "Wishing you a wonderful birthday! May success follow you wherever you go. 🚀",
            "Happy Birthday, {name}! Here’s to celebrating the amazing person and professional that you are. 🏅",
            "Sending big birthday wishes your way! Hope your day is absolutely spectacular. 🎆",
            "Happy Birthday! Thank you for your endless dedication and hard work. Enjoy your day! 💯",
            "Wishing you a fantastic birthday! May all your hard work pay off this year. 💰",
            "Happy Birthday! Let’s celebrate the wonderful person you are today. 🎉"
        ],
        anniversary: [
            "Congratulations on completing another year with us! Your dedication is inspiring. 🏆",
            "Happy Work Anniversary! Thank you for being such an integral part of Gravity HR. 🌟",
            "Celebrating {name}'s {years} years of excellence! So glad to have you on board. 🤝",
            "Happy Anniversary! May the coming years bring even more success and fulfillment. 🚀",
            "Cheers to your anniversary! Your hard work makes a difference every day. 💎",
            "Happy Work Anniversary, {name}! Thank you for your continued commitment and passion. 🔥",
            "Congratulations on your anniversary! We appreciate all the hard work you do. 👏",
            "Happy Anniversary! Your contributions have been vital to our team's success. 📈",
            "Celebrating your work anniversary today! Thank you for being an amazing colleague. 🙌",
            "Happy Anniversary, {name}! Here's to many more years of working together. 🥂",
            "Congratulations on another milestone year! Your dedication is truly appreciated. 🏅",
            "Happy Work Anniversary! Thank you for always bringing your A-game. 💯",
            "Celebrating {years} of your fantastic work! Happy Anniversary! 🎉",
            "Happy Anniversary! We are so grateful for your loyalty and hard work. 🙏",
            "Congratulations on your anniversary! May you continue to grow and succeed with us. 🌱",
            "Happy Work Anniversary, {name}! Your positive attitude makes a huge difference. 😊",
            "Celebrating your dedication today! Happy Anniversary and best wishes. 🌟",
            "Happy Anniversary! Thank you for being a reliable and hardworking team member. 🛡️",
            "Congratulations on your work anniversary! Your efforts are highly valued. 💎",
            "Happy Anniversary! We look forward to seeing all the great things you'll accomplish next. 🔮",
            "Celebrating another year of excellence! Happy Anniversary, {name}. 🏆",
            "Happy Work Anniversary! Thank you for your continued support and collaboration. 🤝",
            "Congratulations on your anniversary! You are an essential part of our Gravity HR family. 🏠",
            "Happy Anniversary! Your hard work and dedication do not go unnoticed. 👀",
            "Celebrating your milestone today! Happy Anniversary and thank you for everything. 🙌",
            "Happy Work Anniversary, {name}! May your career continue to flourish. 🌸",
            "Congratulations on your anniversary! Here's to celebrating your past and future success. 🍾",
            "Happy Anniversary! Thank you for bringing your unique talents to our team. 🎨",
            "Celebrating {years} of great work! Happy Anniversary, keep up the fantastic job. 👍",
            "Happy Work Anniversary! We appreciate your commitment to excellence. ✨",
            "Congratulations on your anniversary! Your journey with us has been inspiring. 🛤️",
            "Happy Anniversary, {name}! Thank you for being such a great team player. 🏈",
            "Celebrating your work anniversary today! Here's to more shared successes. 🚀",
            "Happy Anniversary! Your positive energy is a blessing to the workplace. ☀️",
            "Congratulations on another great year! Happy Anniversary and best wishes. 🎊",
            "Happy Work Anniversary! Thank you for all the late nights and hard work. 🌙",
            "Celebrating your milestone! Happy Anniversary, {name}. You are truly valued. 💎",
            "Happy Anniversary! We are incredibly lucky to have you on our team. 🍀",
            "Congratulations on your work anniversary! Your dedication sets a great example. 👑",
            "Happy Anniversary! Here's to celebrating your achievements and looking forward to more. 🎯",
            "Celebrating another successful year with you! Happy Anniversary. 🎉",
            "Happy Work Anniversary, {name}! Thank you for your unwavering commitment. ⚓",
            "Congratulations on your anniversary! Your contributions are deeply appreciated. 🌊",
            "Happy Anniversary! May this milestone be just one of many more to come. 🏔️",
            "Celebrating your work anniversary! Thank you for making a positive impact. 💥",
            "Happy Anniversary! Your hard work is the foundation of our success. 🏛️",
            "Congratulations on your anniversary, {name}! Your loyalty is remarkable. 🛡️",
            "Happy Work Anniversary! Thank you for being a constant source of inspiration. 💡",
            "Celebrating your {years} years of service! Happy Anniversary and thank you. 🙏",
            "Happy Anniversary! We can't wait to see what the next year brings for you. 🎁"
        ]
    },
    stories: [], // Active stories generated for today
    interactions: {} // { storyId: { reactions: { like: 0, love: 0, ... }, replies: [] } }
};

// --- INITIALIZATION ---
const initStories = () => {
    loadStoriesData();
    const user = Auth.getCurrentUser();
    
    // Show/Hide Admin actions
    const adminActions = document.getElementById('adminActions');
    if (adminActions && ['Admin', 'HR'].includes(user.role)) {
        adminActions.style.display = 'flex';
    }

    // Generate today's stories if not already generated
    generateDailyStories();
    renderStoriesFeed();
    setupEventListeners();
};

const loadStoriesData = () => {
    const saved = localStorage.getItem('gravity_hr_stories_state');
    if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure we have imported wishes
        if (parsed.wishes) {
            STORIES_STATE.wishes.birthday = [...new Set([...STORIES_STATE.wishes.birthday, ...(parsed.wishes.birthday || [])])];
            STORIES_STATE.wishes.anniversary = [...new Set([...STORIES_STATE.wishes.anniversary, ...(parsed.wishes.anniversary || [])])];
        }
        STORIES_STATE.stories = parsed.stories || [];
        STORIES_STATE.interactions = parsed.interactions || {};
    }
};

const saveStoriesData = () => {
    localStorage.setItem('gravity_hr_stories_state', JSON.stringify(STORIES_STATE));
};

// --- STORY GENERATION LOGIC ---
const generateDailyStories = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayMonthDay = todayStr.substring(5); // MM-DD

    const employees = (typeof STATE !== 'undefined' && STATE.employees) ? STATE.employees : [];

    // Map all existing stories by ID to preserve them and their reactions
    const currentStoriesMap = new Map();
    STORIES_STATE.stories.forEach(s => {
        currentStoriesMap.set(s.id, s);
    });

    const updatedStories = [];

    employees.forEach(emp => {
        if (!emp.status || emp.status !== 'active') return;

        // Birthday Check
        if (emp.dob) {
            const dobParts = emp.dob.split('-');
            const eventDate = new Date(today.getFullYear(), parseInt(dobParts[1]) - 1, parseInt(dobParts[2]));
            
            // If the birthday hasn't happened yet this year, check last year's date
            if (eventDate > today) eventDate.setFullYear(today.getFullYear() - 1);
            
            const diffTime = Math.abs(today - eventDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

            if (diffDays <= 7) {
                const eventDateStr = eventDate.toISOString().split('T')[0];
                const id = `story_${emp.id}_birthday_${eventDateStr}`;
                if (currentStoriesMap.has(id)) {
                    updatedStories.push(currentStoriesMap.get(id));
                } else {
                    updatedStories.push(createStoryObject(emp, 'birthday', 1, eventDateStr, id));
                }
            }
        }

        // Anniversary Check
        if (emp.doj) {
            const dojParts = emp.doj.split('-');
            const eventDate = new Date(today.getFullYear(), parseInt(dojParts[1]) - 1, parseInt(dojParts[2]));
            
            if (eventDate > today) eventDate.setFullYear(today.getFullYear() - 1);
            
            const diffTime = Math.abs(today - eventDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 7) {
                const years = eventDate.getFullYear() - parseInt(dojParts[0]);
                if (years > 0) {
                    const eventDateStr = eventDate.toISOString().split('T')[0];
                    const id = `story_${emp.id}_anniversary_${eventDateStr}`;
                    if (currentStoriesMap.has(id)) {
                        updatedStories.push(currentStoriesMap.get(id));
                    } else {
                        updatedStories.push(createStoryObject(emp, 'anniversary', years, eventDateStr, id));
                    }
                }
            }
        }
    });

    // Update state and persistence
    STORIES_STATE.stories = updatedStories;
    saveStoriesData();
};

const createStoryObject = (emp, type, years = 1, todayStr, id) => {
    const pool = STORIES_STATE.wishes[type];
    const rawWish = pool[Math.floor(Math.random() * pool.length)];
    const wish = rawWish.replace('{name}', emp.name).replace('{years}', years);
    
    return {
        id: id,
        empId: emp.id,
        empName: emp.name,
        empImage: emp.image || null,
        type: type,
        wish: wish,
        frameVariant: Math.floor(Math.random() * 6) + 1,
        date: todayStr
    };
};

// --- RENDERING ---
const renderStoriesFeed = () => {
    const feed = document.getElementById('storiesFeed');
    if (!feed) return;

    if (STORIES_STATE.stories.length === 0) {
        feed.innerHTML = `
            <div class="loading-state">
                <i class="fa-solid fa-face-smile"></i>
                <p>No celebrations for today. Check back tomorrow!</p>
            </div>
        `;
        return;
    }

    feed.innerHTML = '';
    STORIES_STATE.stories.forEach(story => {
        const stats = STORIES_STATE.interactions[story.id] || { reactions: {}, replies: [] };
        const reactionObjs = stats.reactions || {};
        const replyObjs = stats.replies || [];
        
        const reactionCount = Object.values(reactionObjs).reduce((a, b) => a + b, 0);
        
        // Build individual emoji counts
        const emojiMap = {
            like: '👍',
            love: '❤️',
            celebrate: '🎉',
            wow: '😮',
            care: '🥰'
        };
        
        let reactionsDisplayHtml = '';
        if (reactionCount > 0) {
            reactionsDisplayHtml = Object.entries(reactionObjs)
                .filter(([type, count]) => count > 0)
                .map(([type, count]) => `<span class="reaction-count-item" style="margin-right: 8px;">${emojiMap[type]} ${count}</span>`)
                .join('');
        } else {
            reactionsDisplayHtml = `<span><i class="fa-regular fa-thumbs-up"></i> 0</span>`;
        }
        
        let avatarHtml = '';
        if (story.empImage) {
            avatarHtml = `<img src="${story.empImage}" class="story-avatar" alt="${story.empName}">`;
        } else {
            // Fallback avatar styled to match the new large centered look
            avatarHtml = `<div class="story-avatar" style="background: rgba(255,255,255,0.2); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; font-size: 3.5rem; color: white;"><i class="fa-solid fa-user"></i></div>`;
        }

        // Format the date (from YYYY-MM-DD to e.g., "Oct 24, 2024")
        const dateObj = new Date(story.date);
        const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
        const formattedDate = dateObj.toLocaleDateString('en-US', dateOptions);

        const card = document.createElement('div');
        card.className = 'story-card';
        card.id = `card_${story.id}`;
        card.innerHTML = `
            <div class="story-main-content">
                <!-- LEFT PANEL -->
                <div class="story-left-panel">
                    <div class="story-frame frame-variant-${story.frameVariant}"></div>
                    <div class="story-frame-overlay"></div>
                    <div class="story-left-content">
                        ${avatarHtml}
                        <div class="story-user-name">${story.empName}</div>
                        <div class="story-user-id">${story.type === 'birthday' ? 'Happy Birthday! 🎈' : 'Happy Anniversary! 🎊'}</div>
                        <div class="story-date"><i class="fa-regular fa-calendar-days"></i> ${formattedDate}</div>
                    </div>
                </div>

                <!-- RIGHT PANEL -->
                <div class="story-right-panel">
                    <div class="story-body">
                        <p class="story-wish-text">${story.wish}</p>
                    </div>
                    <div class="story-footer">
                        <div class="story-stats">
                            <div class="reactions-display" style="display: flex; align-items: center;">${reactionsDisplayHtml}</div>
                            <span style="cursor: pointer;" onclick="toggleStoryExpansion('${story.id}')">${replyObjs.length} replies</span>
                        </div>
                        <div class="story-actions">
                            <button class="story-action-btn" onmouseover="showReactions(this)" onmouseout="hideReactions(this)">
                                <i class="fa-regular fa-thumbs-up"></i> React
                                <div class="reactions-popover">
                                    <span class="reaction-emoji" onclick="addReaction('${story.id}', 'like')">👍</span>
                                    <span class="reaction-emoji" onclick="addReaction('${story.id}', 'love')">❤️</span>
                                    <span class="reaction-emoji" onclick="addReaction('${story.id}', 'celebrate')">🎉</span>
                                    <span class="reaction-emoji" onclick="addReaction('${story.id}', 'wow')">😮</span>
                                    <span class="reaction-emoji" onclick="addReaction('${story.id}', 'care')">🥰</span>
                                </div>
                            </button>
                            <button class="story-action-btn" onclick="toggleStoryExpansion('${story.id}')">
                                <i class="fa-regular fa-comment"></i> Reply
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- EXPANDABLE INLINE SECTION -->
            <div class="story-expand-section" id="expand_${story.id}">
                <div class="reply-input-area" style="margin-bottom: 2rem;">
                    <div style="display: flex; gap: 0.75rem;">
                        <input type="text" id="input_${story.id}" placeholder="Write a wish for ${story.empName}..." style="flex: 1;" onkeydown="handleExpansionKeydown(event, '${story.id}')">
                        <button class="btn-primary" onclick="submitInlineReply('${story.id}')">Send</button>
                    </div>
                </div>
                <div class="replies-list" id="list_${story.id}">
                    ${replyObjs.length === 0 ? '<p style="text-align: center; color: var(--text-dim);">No replies yet. Be the first to wish!</p>' : ''}
                    ${replyObjs.map(reply => `
                        <div class="reply-item">
                            <div class="reply-avatar" style="background: var(--secondary-color); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 0.7rem;"><i class="fa-solid fa-user"></i></div>
                            <div class="reply-content">
                                <div class="reply-user">${reply.userName} <span style="font-weight: 400; font-size: 0.7rem; color: var(--text-dim);">${reply.time}</span></div>
                                <div class="reply-msg">${reply.text}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        feed.appendChild(card);
    });
};

// --- INTERACTION HANDLERS ---
window.addReaction = (storyId, type) => {
    if (!STORIES_STATE.interactions[storyId]) {
        STORIES_STATE.interactions[storyId] = { reactions: {}, replies: [] };
    }
    if (!STORIES_STATE.interactions[storyId].reactions) {
        STORIES_STATE.interactions[storyId].reactions = {};
    }
    const current = STORIES_STATE.interactions[storyId].reactions[type] || 0;
    STORIES_STATE.interactions[storyId].reactions[type] = current + 1;
    saveStoriesData();
    renderStoriesFeed();
};

window.toggleStoryExpansion = (storyId) => {
    const expansion = document.getElementById(`expand_${storyId}`);
    if (!expansion) return;

    const isActive = expansion.classList.contains('active');
    
    // Close all other expansions first (user's request: "next post need to close the expantion")
    document.querySelectorAll('.story-expand-section').forEach(ex => {
        if (ex.id !== `expand_${storyId}`) ex.classList.remove('active');
    });

    if (isActive) {
        expansion.classList.remove('active');
    } else {
        expansion.classList.add('active');
        // Focus the input when expanding
        const input = document.getElementById(`input_${storyId}`);
        if (input) setTimeout(() => input.focus(), 300);
    }
};

window.handleExpansionKeydown = (e, storyId) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        window.submitInlineReply(storyId);
    }
};

window.submitInlineReply = (storyId) => {
    const input = document.getElementById(`input_${storyId}`);
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    const user = Auth.getCurrentUser();
    if (!user) {
        alert("Error: You must be logged in to reply.");
        return;
    }

    if (!STORIES_STATE.interactions[storyId]) {
        STORIES_STATE.interactions[storyId] = { reactions: {}, replies: [] };
    }
    if (!STORIES_STATE.interactions[storyId].replies) {
        STORIES_STATE.interactions[storyId].replies = [];
    }
    
    STORIES_STATE.interactions[storyId].replies.push({
        userName: user.name || 'User',
        userId: user.id || 'N/A',
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    input.value = '';
    saveStoriesData();
    renderStoriesFeed();
    
    // Maintain expansion after re-render
    setTimeout(() => {
        const newExpansion = document.getElementById(`expand_${storyId}`);
        if (newExpansion) {
            newExpansion.classList.add('active');
            // Scroll into view if needed
            newExpansion.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, 50);
};

// --- ADMIN FEATURES ---
const setupEventListeners = () => {
    const importBtn = document.getElementById('importWishesBtn');
    const importModal = document.getElementById('importModal');
    const closeBtns = document.querySelectorAll('.close-modal, .close-modal-btn');
    const confirmImport = document.getElementById('confirmImportBtn');

    if (importBtn) {
        importBtn.onclick = () => {
            importModal.style.display = 'flex';
            setTimeout(() => importModal.classList.add('active'), 10);
        };
    }

    closeBtns.forEach(btn => {
        btn.onclick = () => window.closeAllModals();
    });

    if (confirmImport) {
        confirmImport.onclick = handleImport;
    }
    
    const exportBtn = document.getElementById('exportStoriesBtn');
    if (exportBtn) {
        exportBtn.onclick = handleExport;
    }
};

const handleImport = () => {
    const fileInput = document.getElementById('wishFileInput');
    const type = document.getElementById('wishTypeSelect').value;
    
    if (!fileInput.files.length) {
        alert("Please select a file.");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
        
        if (lines.length === 0) {
            alert("No valid wishes found in file.");
            return;
        }

        STORIES_STATE.wishes[type] = [...new Set([...STORIES_STATE.wishes[type], ...lines])];
        saveStoriesData();
        alert(`Successfully imported ${lines.length} wishes!`);
        window.closeAllModals();
        fileInput.value = '';
    };
    reader.readAsText(file);
};

const handleExport = () => {
    const data = JSON.stringify(STORIES_STATE, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gravity_hr_stories_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
};

// --- HELPERS ---
window.showReactions = (btn) => {
    const popover = btn.querySelector('.reactions-popover');
    if (popover) {
        popover.style.opacity = '1';
        popover.style.visibility = 'visible';
        popover.style.transform = 'translateY(0)';
    }
};

window.hideReactions = (btn) => {
    const popover = btn.querySelector('.reactions-popover');
    if (popover) {
        popover.style.opacity = '0';
        popover.style.visibility = 'hidden';
        popover.style.transform = 'translateY(10px)';
    }
};

window.closeAllModals = () => {
    document.querySelectorAll('.modal-overlay').forEach(m => {
        m.classList.remove('active');
        setTimeout(() => {
            m.style.display = 'none';
        }, 300);
    });
};

// Start the app when main scripts are ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait slightly to ensure STATE is loaded by script.js
    setTimeout(initStories, 500);
});
