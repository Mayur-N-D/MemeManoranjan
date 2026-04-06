document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const memeGrid = document.getElementById('meme-grid');
    const searchInput = document.getElementById('meme-search');
    const searchBtn = document.getElementById('search-btn');
    const randomBtn = document.getElementById('random-btn');
    const loader = document.getElementById('loading');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');

    // State
    let allMemes = [];
    let displayedMemesCount = 0;
    const MEMES_PER_PAGE = 12;
    let favorites = JSON.parse(localStorage.getItem('memeFavorites')) || [];
    let isFavoritesView = false;

    const GEMINI_API_KEY = 'AIzaSyCV0Qj_qq-dNPKoEhkNJ-Lxs3scpAxU_fQ';
    const captionCache = new Map();
    const API_BASE_URL = 'http://127.0.0.1:5000/api';

    // Initialize
    init();

    function init() {
        initAuth();
        checkBackendConnection();
        fetchMemes();
        setupEventListeners();
    }

    async function checkBackendConnection() {
        try {
            const response = await fetch(`${API_BASE_URL}/`);
            if (response.ok) {
                console.log('✅ Connected to Flask Backend');
            }
        } catch (err) {
            console.error('❌ Backend connection error:', err);
            console.warn('⚠️ Backend not reachable. Authentication features may not work.');
        }
    }

    // Feature: User Authentication UI
    function initAuth() {
        const token = localStorage.getItem('token');
        const userJson = localStorage.getItem('user');
        const loginBtn = document.getElementById('login-nav-btn');
        const profileContainer = document.getElementById('profile-container');
        const avatar = document.getElementById('profile-avatar');
        const dropdown = document.getElementById('profile-dropdown');
        const userNameEl = document.getElementById('user-display-name');
        const userEmailEl = document.getElementById('user-display-email');
        const logoutBtn = document.getElementById('logout-btn');

        if (token && userJson) {
            const user = JSON.parse(userJson);
            const initial = (user.username || user.email || 'U').charAt(0).toUpperCase();

            // UI Toggle
            if (loginBtn) loginBtn.style.display = 'none';
            if (profileContainer) profileContainer.style.display = 'flex';

            // Set data
            if (avatar) avatar.textContent = initial;
            if (userNameEl) userNameEl.textContent = user.username || 'User';
            if (userEmailEl) userEmailEl.textContent = user.email;

            // Dropdown toggle
            if (avatar) {
                avatar.onclick = (e) => {
                    e.stopPropagation();
                    dropdown.classList.toggle('show-dropdown');
                };
            }

            // Close dropdown on click outside
            document.addEventListener('click', () => {
                if (dropdown) dropdown.classList.remove('show-dropdown');
            });

            // Logout
            if (logoutBtn) {
                logoutBtn.onclick = () => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.reload();
                };
            }
        } else {
            if (loginBtn) loginBtn.style.display = 'inline-block';
            if (profileContainer) profileContainer.style.display = 'none';
        }
    }

    function isLoggedIn() {
        return !!localStorage.getItem('token');
    }

    function showAuthModal(featureName) {
        // Remove existing modal if any
        const existing = document.querySelector('.glass-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.className = 'glass-modal';
        modal.innerHTML = `
            <div class="glass-modal-content">
                <div class="glass-modal-icon">
                    <i class="fas fa-lock"></i>
                </div>
                <h2>Login Required</h2>
                <p>You need to be logged in to use <strong>${featureName}</strong>. Join the MemeManoranjan community to unlock all features!</p>
                <div class="glass-modal-buttons">
                    <a href="login.html" class="modal-btn-primary">Log In Now</a>
                    <a href="signup.html" class="modal-btn-secondary">Create Account</a>
                    <button class="modal-btn-secondary" onclick="this.closest('.glass-modal').classList.remove('active')">Maybe Later</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Trigger reflow for animation
        setTimeout(() => modal.classList.add('active'), 10);

        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            }
        };
    }

    // Fetch Memes from Imgflip
    async function fetchMemes() {
        showLoader(true);
        hideError();

        try {
            const response = await fetch('https://api.imgflip.com/get_memes');
            const data = await response.json();

            if (data.success) {
                allMemes = data.data.memes;
                renderMemes(getMemesPage());
                setupInfiniteScroll();
                renderTemplateGallery();
            } else {
                showError('Failed to fetch memes. Please try again later.');
            }
        } catch (error) {
            showError('Network error. Check your connection.');
            console.error('Fetch error:', error);
        } finally {
            showLoader(false);
        }
    }

    function getMemesPage() {
        const start = displayedMemesCount;
        const end = start + MEMES_PER_PAGE;
        const newMemes = allMemes.slice(start, end);
        displayedMemesCount = end;
        return newMemes;
    }

    // Feature 5: Infinite Scroll
    function setupInfiniteScroll() {
        const sentinel = document.getElementById('scroll-sentinel');
        if (!sentinel) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !isFavoritesView && displayedMemesCount < allMemes.length) {
                sentinel.classList.remove('hidden');
                // Simulate slight network delay for effect
                setTimeout(() => {
                    const moreMemes = getMemesPage();
                    appendMemes(moreMemes);
                    if (displayedMemesCount >= allMemes.length) {
                        sentinel.classList.add('hidden');
                    }
                }, 500);
            }
        }, { rootMargin: '100px' });

        observer.observe(sentinel);
    }

    // Feature 2: Template Gallery
    function renderTemplateGallery() {
        const gallery = document.getElementById('template-gallery');
        if (!gallery) return;

        // Picking a few popular ones from imgflip by known names
        const popularNames = ["Drake Hotline Bling", "Distracted Boyfriend", "Two Buttons", "Woman Yelling At Cat", "Change My Mind", "Epic Handshake", "Disaster Girl", "UNO Draw 25 Cards"];
        const templates = allMemes.filter(m => popularNames.includes(m.name)).slice(0, 8);

        gallery.innerHTML = templates.map(t => `
            <div class="template-item" data-id="${t.id}" data-name="${t.name}">
                <img src="${t.url}" alt="${t.name}" loading="lazy" crossorigin="anonymous">
            </div>
        `).join('');

        gallery.querySelectorAll('.template-item').forEach(item => {
            item.onclick = () => {
                searchInput.value = item.getAttribute('data-name');
                searchMemes();
                window.scrollTo({ top: document.querySelector('.meme-section').offsetTop, behavior: 'smooth' });
            };
        });
    }


    // AI Image Analysis for Uploaded Title
    async function generateImageTitle(file) {
        if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
            throw new Error('Gemini API Key missing for image analysis.');
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                try {
                    const base64Data = reader.result.split(',')[1];
                    const mimeType = file.type;

                    const requestBody = {
                        contents: [{
                            parts: [
                                { text: "Analyze this image and give it a short, funny, and catchy title for a meme site. Max 5 words. Do not include quotes. Do not include extra commentary." },
                                {
                                    inlineData: {
                                        mimeType: mimeType,
                                        data: base64Data
                                    }
                                }
                            ]
                        }]
                    };

                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody)
                    });

                    if (!response.ok) throw new Error('API request failed');

                    const data = await response.json();
                    if (data.error) throw new Error(data.error.message);

                    const title = data.candidates[0].content.parts[0].text.trim().replace(/"/g, '');
                    resolve(title || 'My Awesome Custom Meme');
                } catch (err) {
                    console.error('Failed to generate image title:', err);
                    resolve('My Custom Meme'); // Fallback
                }
            };
            reader.onerror = error => reject(error);
        });
    }

    // AI Caption Generation
    async function generateAICaption(keyword, memeName) {
        if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
            throw new Error('Gemini API Key is missing. Please add it to script.js.');
        }

        const cacheKey = `${keyword}-${memeName}`;
        if (captionCache.has(cacheKey)) return captionCache.get(cacheKey);

        const prompt = `Generate a short humorous meme caption about: ${keyword}. The meme is "${memeName}". Keep it under 12 words, and return only the text.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) throw new Error('API request failed');

        const data = await response.json();
        const caption = data.candidates[0].content.parts[0].text.trim().replace(/^"|"$/g, '');

        captionCache.set(cacheKey, caption);
        return caption;
    }

    // Render Meme Cards
    function renderMemes(memes) {
        memeGrid.innerHTML = '';
        displayedMemesCount = memes.length; // reset count for current view
        appendMemes(memes);
    }

    function appendMemes(memes) {
        if (memes.length === 0 && memeGrid.innerHTML === '') {
            showError('No memes found.');
            return;
        }

        memes.forEach((meme, index) => {
            const card = document.createElement('div');
            card.className = 'meme-card glass';
            card.style.animationDelay = `${(index % 12) * 0.1}s`;

            const isFav = favorites.some(f => f.id === meme.id);
            const heartClass = isFav ? 'fas fa-heart' : 'far fa-heart';
            const activeClass = isFav ? 'active' : '';

            card.innerHTML = `
                <div class="meme-img-container" style="position: relative;">
                    <div class="meme-overlay-wrapper">
                        <div class="meme-text meme-text-top" contenteditable="true" spellcheck="false" style="top: 10px; left: 0px;"></div>
                        <img src="${meme.url}" alt="${meme.name}" loading="lazy" crossorigin="anonymous" draggable="false">
                        <div class="meme-text meme-text-bottom" contenteditable="true" spellcheck="false" style="bottom: 10px; left: 0px;"></div>
                    </div>
                </div>
                <div class="meme-info">
                    <h3>${meme.name}</h3>
                    
                    <div class="card-actions">
                        <button class="action-btn download" data-name="${meme.name}" data-url="${meme.url}">
                            <i class="fas fa-download"></i> Save Image
                        </button>
                        <button class="action-btn ai-gen-btn" data-name="${meme.name}">
                            <i class="fas fa-robot"></i> AI Caption
                            <i class="fas fa-spinner fa-spin"></i>
                        </button>
                    </div>

                    <div class="social-actions">
                        <button class="icon-btn favorite ${activeClass}" data-id="${meme.id}" title="Favorite">
                            <i class="${heartClass}"></i>
                        </button>
                        <button class="icon-btn copy" data-url="${meme.url}" title="Copy Link">
                            <i class="fas fa-link"></i>
                        </button>
                        <button class="icon-btn share-btn whatsapp" data-url="${meme.url}" data-platform="WhatsApp" title="Share on WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button class="icon-btn share-btn instagram" data-platform="Instagram" title="Share on Instagram">
                            <i class="fab fa-instagram"></i>
                        </button>
                        <button class="icon-btn share-btn facebook" data-url="${meme.url}" data-platform="Facebook" title="Share on Facebook">
                            <i class="fab fa-facebook-f"></i>
                        </button>
                    </div>
                </div>
            `;
            memeGrid.appendChild(card);
        });

        setupCardActions();
        setupDragAndDrop();
    }

    // Search Logic
    function searchMemes() {
        isFavoritesView = false;
        document.getElementById('nav-home').classList.add('active');
        document.getElementById('nav-favorites').classList.remove('active');
        document.getElementById('scroll-sentinel').classList.add('hidden');

        const query = searchInput.value.toLowerCase().trim();
        if (!query) {
            displayedMemesCount = 0;
            renderMemes(getMemesPage());
            document.getElementById('scroll-sentinel').classList.remove('hidden');
            return;
        }

        const filtered = allMemes.filter(meme =>
            meme.name.toLowerCase().includes(query)
        );

        renderMemes(filtered);
    }

    // Random Memes
    function getRandomMemes() {
        isFavoritesView = false;
        const shuffled = [...allMemes].sort(() => 0.5 - Math.random());
        renderMemes(shuffled.slice(0, 12));
        searchInput.value = '';
    }

    // Favorites View
    function toggleFavoritesView() {
        isFavoritesView = true;
        searchInput.value = '';
        document.getElementById('nav-home').classList.remove('active');
        document.getElementById('nav-favorites').classList.add('active');
        document.getElementById('scroll-sentinel').classList.add('hidden');
        renderMemes(favorites);
    }

    // Event Listeners
    function setupEventListeners() {
        searchBtn.addEventListener('click', searchMemes);

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchMemes();
        });

        randomBtn.addEventListener('click', getRandomMemes);

        const navHome = document.getElementById('nav-home');
        if (navHome) navHome.addEventListener('click', () => { searchInput.value = ''; searchMemes(); });

        const navFav = document.getElementById('nav-favorites');
        if (navFav) navFav.addEventListener('click', toggleFavoritesView);

        // Upload own image
        const imageUpload = document.getElementById('image-upload');
        if (imageUpload) {
            imageUpload.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    showLoader(true);
                    try {
                        const title = await generateImageTitle(file);
                        const url = URL.createObjectURL(file);
                        const customMeme = {
                            id: 'custom-' + Date.now(),
                            name: title,
                            url: url
                        };
                        // Add to beginning of allMemes
                        allMemes.unshift(customMeme);
                        // Clear search and render
                        searchInput.value = '';
                        renderMemes(allMemes.slice(0, 12));
                    } catch (err) {
                        console.error('Upload handling error:', err);
                        // Fallback purely local
                        const url = URL.createObjectURL(file);
                        const customMeme = {
                            id: 'custom-' + Date.now(),
                            name: 'My Custom Meme',
                            url: url
                        };
                        allMemes.unshift(customMeme);
                        searchInput.value = '';
                        renderMemes(allMemes.slice(0, 12));
                    } finally {
                        showLoader(false);
                        e.target.value = '';
                    }
                }
            });
        }

        // Popular Template Tags
        document.querySelectorAll('.tag-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const template = e.target.getAttribute('data-template');
                searchInput.value = template;
                searchMemes();
            });
        });
    }

    // Card Actions
    function setupCardActions() {
        document.querySelectorAll('.copy').forEach(btn => {
            btn.onclick = async (e) => {
                if (!isLoggedIn()) {
                    showAuthModal('Copy Link');
                    return;
                }
                const url = e.currentTarget.getAttribute('data-url');
                try {
                    await navigator.clipboard.writeText(url);
                    const originalHTML = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-check"></i>';
                    setTimeout(() => { btn.innerHTML = originalHTML; }, 2000);
                } catch (err) {
                    alert('Failed to copy link');
                }
            };
        });

        // Feature 6: Favorite Logic
        document.querySelectorAll('.favorite').forEach(btn => {
            btn.onclick = (e) => {
                if (!isLoggedIn()) {
                    showAuthModal('Add to Favorites');
                    return;
                }
                const id = btn.getAttribute('data-id');
                const meme = allMemes.find(m => m.id === id) || favorites.find(m => m.id === id);
                if (!meme) return;

                const index = favorites.findIndex(f => f.id === id);
                const icon = btn.querySelector('i');

                if (index > -1) {
                    favorites.splice(index, 1);
                    icon.className = 'far fa-heart';
                    btn.classList.remove('active');
                    if (isFavoritesView) renderMemes(favorites); // Live update view
                } else {
                    favorites.push(meme);
                    icon.className = 'fas fa-heart';
                    btn.classList.add('active');
                }
                localStorage.setItem('memeFavorites', JSON.stringify(favorites));
            };
        });

        document.querySelectorAll('.ai-gen-btn').forEach(btn => {
            btn.onclick = async (e) => {
                if (!isLoggedIn()) {
                    showAuthModal('AI Caption Generator');
                    return;
                }
                const memeName = btn.getAttribute('data-name');
                const keyword = searchInput.value.trim() || 'something funny';
                const card = btn.closest('.meme-card');
                const topText = card.querySelector('.meme-text-top');
                const bottomText = card.querySelector('.meme-text-bottom');

                // Toggle logic: If currently blue (active), hide the caption and revert button
                if (btn.classList.contains('btn-blue')) {
                    topText.textContent = '';
                    bottomText.textContent = '';
                    btn.classList.remove('btn-blue');
                    btn.innerHTML = `<i class="fas fa-robot"></i> AI Caption <i class="fas fa-spinner fa-spin"></i>`;
                    return;
                }

                // Otherwise, generate caption
                btn.classList.add('loading');
                try {
                    const caption = await generateAICaption(keyword, memeName);
                    // Split caption if too long or just use for bottom
                    if (caption.length > 20) {
                        const words = caption.split(' ');
                        const mid = Math.floor(words.length / 2);
                        topText.textContent = words.slice(0, mid).join(' ');
                        bottomText.textContent = words.slice(mid).join(' ');
                    } else {
                        topText.textContent = '';
                        bottomText.textContent = caption;
                    }

                    // State change to active (Blue)
                    btn.classList.add('btn-blue');
                    btn.innerHTML = `<i class="fas fa-eye-slash"></i> Hide Caption <i class="fas fa-spinner fa-spin"></i>`;

                } catch (err) {
                    alert(err.message || 'Could not generate caption. Try again.');
                } finally {
                    btn.classList.remove('loading');
                }
            };
        });

        document.querySelectorAll('.download').forEach(btn => {
            btn.onclick = async (e) => {
                if (!isLoggedIn()) {
                    showAuthModal('Save Image');
                    return;
                }
                const card = btn.closest('.meme-card');
                const img = card.querySelector('img');
                const name = btn.getAttribute('data-name');
                const topTextEl = card.querySelector('.meme-text-top');
                const bottomTextEl = card.querySelector('.meme-text-bottom');

                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    const tempImg = new Image();
                    tempImg.crossOrigin = "anonymous";
                    tempImg.src = img.src;

                    await new Promise((resolve, reject) => {
                        tempImg.onload = resolve;
                        tempImg.onerror = reject;
                    });

                    canvas.width = tempImg.naturalWidth;
                    canvas.height = tempImg.naturalHeight;

                    // Draw image
                    ctx.drawImage(tempImg, 0, 0);

                    // Setup text style scaling
                    const scaleX = canvas.width / img.offsetWidth;
                    const scaleY = canvas.height / img.offsetHeight;
                    const fontSize = canvas.width / 12;

                    ctx.font = `900 ${fontSize}px Inter, sans-serif`;
                    ctx.fillStyle = 'white';
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = fontSize / 15;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';

                    // Draw Top Text based on dragged offsets
                    if (topTextEl.textContent.trim()) {
                        const topText = topTextEl.textContent.trim().toUpperCase();
                        let tx = img.offsetWidth / 2; // default center horizontally
                        let ty = parseInt(topTextEl.style.top) || 10;

                        // If it has a left property (dragged), use it, plus half width for center alignment
                        if (topTextEl.style.left && topTextEl.style.left !== '0px') {
                            tx = parseInt(topTextEl.style.left) + (topTextEl.offsetWidth / 2);
                        }

                        ctx.strokeText(topText, tx * scaleX, ty * scaleY);
                        ctx.fillText(topText, tx * scaleX, ty * scaleY);
                    }

                    // Draw Bottom Text based on dragged offsets
                    ctx.textBaseline = 'top'; // Use top consistently for easier math with style.top
                    if (bottomTextEl.textContent.trim()) {
                        const bottomText = bottomTextEl.textContent.trim().toUpperCase();
                        let bx = img.offsetWidth / 2;

                        // Parse absolute drag position or fallback to relative bottom position
                        let by = parseInt(bottomTextEl.style.top);
                        if (isNaN(by)) {
                            // It hasn't been dragged (only has bottom: 10px)
                            by = img.offsetHeight - bottomTextEl.offsetHeight - 10;
                        }

                        if (bottomTextEl.style.left && bottomTextEl.style.left !== '0px') {
                            bx = parseInt(bottomTextEl.style.left) + (bottomTextEl.offsetWidth / 2);
                        }

                        ctx.strokeText(bottomText, bx * scaleX, by * scaleY);
                        ctx.fillText(bottomText, bx * scaleX, by * scaleY);
                    }

                    // Download
                    const link = document.createElement('a');
                    link.download = `${name.replace(/\s+/g, '_')}_meme.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                } catch (err) {
                    console.error('Download error:', err);
                    alert('Download failed. Try right-clicking the image.');
                }
            };
        });

        // Share Actions
        document.querySelectorAll('.share-btn').forEach(btn => {
            btn.onclick = (e) => {
                const platform = btn.getAttribute('data-platform');
                if (!isLoggedIn()) {
                    showAuthModal(`Share to ${platform}`);
                    return;
                }

                const url = btn.getAttribute('data-url');
                let shareUrl = '';

                if (platform === 'WhatsApp') {
                    shareUrl = `https://api.whatsapp.com/send?text=Check out this meme: ${url}`;
                } else if (platform === 'Instagram') {
                    shareUrl = `https://www.instagram.com/`;
                } else if (platform === 'Facebook') {
                    shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                }

                if (shareUrl) window.open(shareUrl, '_blank');
            };
        });
    }

    // Feature 3: Drag and Drop Logic
    function setupDragAndDrop() {
        let isDragging = false;
        let currentElement = null;
        let initialX, initialY, currentX, currentY, xOffset, yOffset;

        document.querySelectorAll('.meme-text').forEach(textEl => {
            textEl.addEventListener('mousedown', dragStart);
        });

        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        function dragStart(e) {
            // Only drag if clicking the box, but not if clicking strictly to type text
            if (document.activeElement === e.target) return;

            initialX = e.clientX;
            initialY = e.clientY;

            // Get current translations or pos
            currentElement = e.target;
            const style = window.getComputedStyle(currentElement);
            // Convert everything to top/left absolute pixels within wrapper
            if (currentElement.style.bottom) {
                currentElement.style.top = (currentElement.parentElement.offsetHeight - currentElement.offsetHeight - parseInt(style.bottom)) + 'px';
                currentElement.style.bottom = 'auto';
            }

            xOffset = parseInt(style.left) || 0;
            yOffset = parseInt(style.top) || 0;

            isDragging = true;
            currentElement.classList.add('dragging');
        }

        function drag(e) {
            if (isDragging && currentElement) {
                e.preventDefault();

                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                let newX = xOffset + currentX;
                let newY = yOffset + currentY;

                // Constraints within bounds
                const parent = currentElement.parentElement;
                const maxX = parent.offsetWidth - currentElement.offsetWidth;
                const maxY = parent.offsetHeight - currentElement.offsetHeight;

                newX = Math.max(0, Math.min(newX, maxX));
                newY = Math.max(0, Math.min(newY, maxY));

                currentElement.style.left = newX + 'px';
                currentElement.style.top = newY + 'px';
            }
        }

        function dragEnd() {
            if (!isDragging) return;
            initialX = currentX;
            initialY = currentY;
            isDragging = false;

            if (currentElement) {
                currentElement.classList.remove('dragging');
                currentElement = null;
            }
        }
    }

    // UI Helpers
    function showLoader(show) {
        loader.classList.toggle('hidden', !show);
        if (show) memeGrid.innerHTML = '';
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        errorContainer.classList.remove('hidden');
        memeGrid.innerHTML = '';
    }

    function hideError() {
        errorContainer.classList.add('hidden');
    }
});
