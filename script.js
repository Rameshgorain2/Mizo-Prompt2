/* --- JAVASCRIPT LOGIC (Website Functionality) --- */

// --- AUTHOR CONSTANTS (MOCK) ---
const DEFAULT_AUTHOR_NAME = "Ramesh Gorain";
const DEFAULT_AUTHOR_LOGO = "https://i.ibb.co/Gm4f6W4/Picsart-25-12-04-06-31-31-727.webp";
const DEFAULT_VERIFIED_ICON = "https://i.ibb.co/TMPHwgGp/Picsart-25-12-04-06-32-14-489.webp";
const CURRENT_AUTHOR_KEY = 'ramesh_gorain'; 
// -------------------------------

// 1. FIREBASE CONFIGURATION & INITIALIZATION
const firebaseConfig = {
    apiKey: "AIzaSyBgB1CD5wtXN7E2a_Qd7ch6pt2t6lzJLX8",
    authDomain: "mizo-prompt.firebaseapp.com",
    databaseURL: "https://mizo-prompt-default-rtdb.firebaseio.com",
    projectId: "mizo-prompt",
    storageBucket: "mizo-prompt.firebasestorage.app",
    messagingSenderId: "328234820",
    appId: "1:328234820:web:1e6aeccdd11af6d69d4911"
};

const app = firebase.initializeApp(firebaseConfig);
const db = app.database(); 

let allPrompts = []; 
let filteredPrompts = []; 
let currentSort = 'latest'; 

const listingPage = document.getElementById('listing-page');
const detailPage = document.getElementById('detail-page');
const favoritesPage = document.getElementById('favorites-page'); 
const profilePage = document.getElementById('profile-page');
const profilePostsGrid = document.getElementById('profile-posts-grid');
const detailPromptTitle = document.getElementById('detail-prompt-title'); 
const detailPromptImage = document.getElementById('detail-prompt-image');
const detailPromptText = document.getElementById('detail-prompt-text');
const copyButton = document.getElementById('copy-btn');
const geminiButton = document.getElementById('gemini-btn'); 
const appAlert = document.getElementById('app-alert'); 
const copiedAlert = document.getElementById('copied-alert');
const body = document.body;
const modeChanger = document.getElementById('mode-changer');
const searchInput = document.getElementById('search-input');
const progressBar = document.getElementById('progress-bar'); 
const sortFilterMenu = document.getElementById('sort-filter-menu');

const GEMINI_URL = "https://gemini.google.com/";

// --- UTILITY: PROGRESS BAR ---
function setProgress(width) {
    progressBar.style.width = width + '%';
}

// --- UTILITY: SLUG GENERATION ---
function createSlug(text) {
    return text.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

// --- ROUTING ENGINE (Client Side URL Handler) ---
function navigateTo(url) {
    history.pushState(null, null, url);
    handleRouting();
}

function handleRouting() {
    const path = window.location.pathname;
    
    // Default to Home logic for root or /Home
    if (path === '/' || path.toLowerCase() === '/home') {
        renderListingView();
    }
    // Profile Route: /Profile/username
    else if (path.toLowerCase().startsWith('/profile/')) {
        const parts = path.split('/');
        // /Profile/name -> parts[0]="", parts[1]="Profile", parts[2]="name"
        const profileName = parts[2];
        if (profileName) {
            renderProfileView(profileName);
        } else {
            renderListingView();
        }
    }
    // Detail Route: /Post-Name/-Username
    // We check if the path contains a username separator pattern or just treat it as a slug
    else {
        // Remove leading slash
        const rawSlug = path.substring(1); 
        // Logic: Try to find a prompt where the slug matches
        // Format: /beautiful-sunset/-ramesh_gorain
        
        // Extract slug before the "/-" if it exists
        const slugEndIndex = rawSlug.indexOf('/-');
        let promptSlug = '';
        
        if (slugEndIndex !== -1) {
            promptSlug = rawSlug.substring(0, slugEndIndex);
        } else {
            promptSlug = rawSlug;
        }

        const prompt = allPrompts.find(p => createSlug(p.title) === promptSlug);
        
        if (prompt) {
            renderDetailView(prompt.id);
        } else {
            // If prompt not found in loaded data (or data not loaded yet), handle in data loader
            if(allPrompts.length > 0) {
                 renderListingView(); // Fallback if data loaded but prompt not found
            }
        }
    }
}

// Listen for Back/Forward Browser Buttons
window.addEventListener('popstate', handleRouting);

// --- UTILITY: ALERT MESSAGE ---
function showAlert(message, type = 'success', duration = 2500) {
    appAlert.textContent = message;
    appAlert.style.backgroundColor = type === 'error' ? '#dc3545' : (type === 'warning' ? 'var(--warning-color)' : 'var(--success-color)');
    appAlert.style.color = type === 'warning' ? 'var(--text-color)' : 'white';
    appAlert.style.display = 'block';

    setTimeout(() => {
        appAlert.style.display = 'none';
    }, duration);
}

// --- MODE CHANGER FUNCTIONS ---
function toggleDarkMode() {
    body.classList.toggle('dark-mode');
    const isDarkMode = body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    modeChanger.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        modeChanger.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        body.classList.remove('dark-mode'); 
        modeChanger.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

// --- SEARCH BAR FUNCTIONS ---
function toggleSearch() {
    if (searchInput.classList.contains('expanded')) {
        searchInput.classList.remove('expanded');
        searchInput.value = '';
        filterPrompts(''); 
    } else {
        searchInput.classList.add('expanded');
        searchInput.focus();
    }
}

function filterPrompts(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    if (allPrompts.length === 0) return;

    filteredPrompts = allPrompts.filter(prompt => {
        const titleMatch = prompt.title.toLowerCase().includes(term);
        const promptMatch = prompt.promptText ? prompt.promptText.toLowerCase().includes(term) : false;
        return titleMatch || promptMatch;
    });
    
    sortPrompts(currentSort);
}

// 🎯 DYNAMIC LOADER (Skeleton)
function showLoader(show, count = 8) { 
    listingPage.innerHTML = ''; 
    setProgress(0); 
    sortFilterMenu.style.display = show ? 'none' : 'flex'; 

    if (show) {
        listingPage.style.display = 'grid'; 
        detailPage.style.display = 'none'; 
        favoritesPage.style.display = 'none';
        profilePage.style.display = 'none'; 
        setProgress(30); 

        for (let i = 0; i < count; i++) {
            const card = document.createElement('div');
            card.className = 'skeleton-card-container';
            
            const imagePlaceholder = document.createElement('div');
            imagePlaceholder.className = 'skeleton-box skeleton-image';
            imagePlaceholder.style.animationDelay = `${i * 0.05}s`; 
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'skeleton-content';
            
            // Header
            const headerRow = document.createElement('div');
            headerRow.className = 'skeleton-header';

            const titleBox = document.createElement('div');
            titleBox.style.flexGrow = '1';
            
            const titleLine1 = document.createElement('div');
            titleLine1.className = 'skeleton-box skeleton-title-long';
            titleLine1.style.animationDelay = `${i * 0.05 + 0.1}s`;

            const titleLine2 = document.createElement('div');
            titleLine2.className = 'skeleton-box skeleton-title-short';
            titleLine2.style.animationDelay = `${i * 0.05 + 0.2}s`;
            
            titleBox.appendChild(titleLine1);
            titleBox.appendChild(titleLine2);

            const likePlaceholder = document.createElement('div');
            likePlaceholder.className = 'skeleton-box skeleton-like-button'; 
            likePlaceholder.style.animationDelay = `${i * 0.05 + 0.3}s`;

            headerRow.appendChild(titleBox);
            headerRow.appendChild(likePlaceholder);
            
            // Author
            const authorInfoSkeleton = document.createElement('div');
            authorInfoSkeleton.className = 'skeleton-author-info';

            const logoSkeleton = document.createElement('div');
            logoSkeleton.className = 'skeleton-box skeleton-author-logo';
            logoSkeleton.style.animationDelay = `${i * 0.05 + 0.4}s`;
            
            const nameSkeleton = document.createElement('div');
            nameSkeleton.className = 'skeleton-box skeleton-author-name';
            nameSkeleton.style.animationDelay = `${i * 0.05 + 0.5}s`;

            authorInfoSkeleton.appendChild(logoSkeleton);
            authorInfoSkeleton.appendChild(nameSkeleton);

            // Date
            const dateLine = document.createElement('div');
            dateLine.className = 'skeleton-box skeleton-date-line';
            dateLine.style.animationDelay = `${i * 0.05 + 0.6}s`;
            
            contentDiv.appendChild(headerRow);
            contentDiv.appendChild(authorInfoSkeleton); 
            contentDiv.appendChild(dateLine);
            
            card.appendChild(imagePlaceholder);
            card.appendChild(contentDiv);
            
            listingPage.appendChild(card);
        }
    } 
}

// --- SORTING LOGIC ---
function sortPrompts(sortBy, buttonElement = null) {
    currentSort = sortBy;
    let listToSort = searchInput.value.trim() !== '' ? filteredPrompts : allPrompts;

    const clickData = getClickData();
    
    listToSort.sort((a, b) => {
        const dateA = a.dateCreated ? new Date(a.dateCreated).getTime() : 0;
        const dateB = b.dateCreated ? new Date(b.dateCreated).getTime() : 0;
        
        if (sortBy === 'latest') {
            return dateB - dateA;
        } else if (sortBy === 'popular') {
            const likesA = a.likes || 0;
            const likesB = b.likes || 0;
            const clicksA = clickData[a.id] || 0;
            const clicksB = clickData[b.id] || 0;
            
            const scoreA = (likesA * 2) + clicksA;
            const scoreB = (likesB * 2) + clicksB;
            
            if (scoreB !== scoreA) {
                return scoreB - scoreA;
            }
            return dateB - dateA; 
        }
        return 0;
    });
    
    renderCards(listToSort, listingPage);
    
    if (buttonElement) {
        document.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));
        buttonElement.classList.add('active');
    }
}

// --- COMMON AUTHOR HTML GENERATION ---
function getAuthorHtml(authorKey) {
    const authorName = DEFAULT_AUTHOR_NAME;
    const authorLogo = DEFAULT_AUTHOR_LOGO;
    const verifiedIcon = DEFAULT_VERIFIED_ICON;
    
    const verifiedTag = `<img src="${verifiedIcon}" alt="Verified" class="verified-icon">`;

    // Note: We don't put onclick in the HTML string here to avoid confusion with bubble propagation, 
    // but the card handler manages navigation, or we can use specific IDs.
    // For specific Profile navigation from card:
    return `
        <div class="author-info" onclick="event.stopPropagation(); showProfilePage('${authorKey}')">
            <img src="${authorLogo}" alt="Author Logo" class="author-logo">
            <div class="author-name-wrapper">
                ${authorName} ${verifiedTag}
            </div>
        </div>
    `;
}

// --- RENDERING FUNCTIONS ---
function createPromptCard(prompt, isTrending, likedPrompts) {
    const card = document.createElement('div');
    card.className = 'prompt-card';
    card.onclick = (e) => {
        // Prevent navigation if clicking specific inner elements
        if (!e.target.closest('.like-button') && !e.target.closest('.author-info')) {
            showDetailPage(prompt.id);
        }
    }; 
    
    setTimeout(() => {
        card.classList.add('loaded');
    }, 50);

    const trendingLabel = isTrending ? '<div class="trending-label">TRENDING 🔥</div>' : '';
    const isLiked = likedPrompts[prompt.id];

    const authorKey = CURRENT_AUTHOR_KEY; 
    const authorHtml = getAuthorHtml(authorKey);

    card.innerHTML = `
        ${trendingLabel}
        <div class="card-image">
            <img src="${prompt.coverImageUrl}" alt="${prompt.title}" loading="lazy" onerror="this.onerror=null;this.src='https://placehold.co/400x200/3d3d5c/ffffff?text=No+Image'">
        </div>
        <div class="card-content">
            <div>
                <div class="card-content-header">
                    <h2>${prompt.title}</h2>
                    <button class="like-button ${isLiked ? 'liked' : ''}" data-id="${prompt.id}" onclick="likePrompt(event, '${prompt.id}', this)">
                        <i class="far fa-heart"></i>  <i class="fas fa-heart"></i> 
                        <span class="like-count">${prompt.likes || 0}</span>
                    </button>
                </div>
                ${authorHtml} 
            </div>
            <p>Date: ${prompt.dateCreated || 'N/A'}</p>
        </div>
    `;
    return card;
}

function renderCards(promptsToRender, targetElement = listingPage) {
    targetElement.innerHTML = '';
    
    if (promptsToRender.length === 0) {
        targetElement.innerHTML = `<div class="empty-favorites" style="grid-column: 1 / -1; font-size: 1.2rem; text-align: center; padding-top: 50px;">No results found.</div>`;
        return;
    }
    
    const likedPrompts = JSON.parse(localStorage.getItem('likedPrompts') || '{}');

    promptsToRender.forEach((prompt) => { 
        const isTrending = (targetElement === listingPage && currentSort === 'popular' && promptsToRender.indexOf(prompt) === 0);
        const card = createPromptCard(prompt, isTrending, likedPrompts);
        targetElement.appendChild(card);
    });
}

// --- VIEW LOGIC (Hides/Shows Divs) ---
function hideAllPages() {
    listingPage.style.display = 'none';
    detailPage.style.display = 'none';
    favoritesPage.style.display = 'none'; 
    profilePage.style.display = 'none'; 
    searchInput.classList.remove('expanded');
    sortFilterMenu.style.display = 'none';
}

// 1. HOME / LISTING VIEW
function showListingPage() {
    navigateTo('/Home');
}

function renderListingView() {
    hideAllPages();
    listingPage.style.display = 'grid';
    sortFilterMenu.style.display = 'flex';
    window.scrollTo(0, 0); 
    setProgress(0); 
    filterPrompts(searchInput.value);
}

// 2. FAVORITES VIEW
function showFavoritesPage() { 
    // Not strictly part of URL requirement, but good to keep consistent
    // We keep this as internal overlay for now or could do /Favorites
    hideAllPages();
    favoritesPage.style.display = 'block';
    renderFavorites();
    window.scrollTo(0, 0); 
}

function renderFavorites() {
    const likedPrompts = JSON.parse(localStorage.getItem('likedPrompts') || '{}');
    const likedIds = Object.keys(likedPrompts);
    
    if (likedIds.length === 0) {
        document.getElementById('favorites-grid').innerHTML = `
            <div class="empty-favorites" style="grid-column: 1 / -1;">
                <i class="far fa-heart" style="font-size: 2em; margin-bottom: 15px; display: block;"></i>
                You haven't liked any prompts yet.<br>
                Click the **Heart** icon to add prompts to your favorites!
            </div>
        `;
        return;
    }
    
    const favoritePrompts = allPrompts.filter(prompt => likedPrompts[prompt.id]);
    favoritePrompts.sort((a, b) => {
        const dateA = a.dateCreated ? new Date(a.dateCreated).getTime() : 0;
        const dateB = b.dateCreated ? new Date(b.dateCreated).getTime() : 0;
        return dateB - dateA; 
    });
    renderCards(favoritePrompts, document.getElementById('favorites-grid'));
}

// 3. DETAIL VIEW
function showDetailPage(id) {
    const prompt = allPrompts.find(p => p.id === id); 
    if(prompt) {
        // Construct URL: /Post-Title-Slug/-Username
        const slug = createSlug(prompt.title);
        const url = `/${slug}/-${CURRENT_AUTHOR_KEY}`;
        navigateTo(url);
    }
}

function renderDetailView(id) {
    const prompt = allPrompts.find(p => p.id === id); 
    
    if (!prompt) {
        showAlert("Prompt not found!", 'error');
        // If navigation fails, go home but don't loop
        if(window.location.pathname !== '/Home') navigateTo('/Home');
        return;
    }

    hideAllPages();
    
    incrementClickCount(id);

    detailPromptTitle.textContent = prompt.title;
    const detailInfoHeader = detailPage.querySelector('.detail-info-header');
    let existingAuthor = detailInfoHeader.querySelector('.author-info');
    if (existingAuthor) {
        existingAuthor.remove();
    }
    detailInfoHeader.insertAdjacentHTML('beforeend', getAuthorHtml(CURRENT_AUTHOR_KEY)); 
    
    const detailImageUrl = prompt.promptImageUrl || prompt.coverImageUrl;

    detailPromptImage.src = detailImageUrl; 
    detailPromptImage.onerror = function() {
        this.onerror=null;
        this.src='https://placehold.co/800x400/3d3d5c/ffffff?text=No+Detail+Image'; 
    }; 
    
    detailPromptText.textContent = prompt.promptText; 
    
    copyButton.onclick = () => copyPrompt(prompt.promptText);
    geminiButton.onclick = handleGeminiClick;

    detailPage.style.display = 'block';
    window.scrollTo(0, 0); 
}

// 4. PROFILE VIEW
function showProfilePage(authorKey) { 
    // Construct URL: /Profile/Username
    const url = `/Profile/${authorKey}`;
    navigateTo(url);
}

function renderProfileView(authorKey) {
    hideAllPages();
    profilePage.style.display = 'block';
    window.scrollTo(0, 0);
    
    document.getElementById('profile-pic').src = DEFAULT_AUTHOR_LOGO;
    document.getElementById('profile-verified-icon').src = DEFAULT_VERIFIED_ICON;
    document.getElementById('profile-name').textContent = DEFAULT_AUTHOR_NAME;
    
    const authorPosts = allPrompts; 

    const totalPosts = authorPosts.length;
    const totalLikes = authorPosts.reduce((sum, prompt) => sum + (prompt.likes || 0), 0);
    const totalFollowers = 0; 

    document.getElementById('total-posts-count').textContent = totalPosts;
    document.getElementById('followers-count').textContent = totalFollowers;
    document.getElementById('likes-count').textContent = totalLikes;
    
    renderCards(authorPosts, profilePostsGrid);
}

// --- BUTTON HANDLERS ---
function handleGeminiClick() {
    window.open(GEMINI_URL, '_blank');
}

async function likePrompt(event, promptId, buttonElement) {
    event.stopPropagation(); 
    
    buttonElement.classList.remove('liked-pop');
    
    let likedPrompts = JSON.parse(localStorage.getItem('likedPrompts') || '{}');
    const isLiked = likedPrompts[promptId];
    
    const countElement = buttonElement.querySelector('.like-count');
    let currentCount = parseInt(countElement.textContent);
    let updateValue = 0; 

    if (isLiked) {
        updateValue = -1;
        buttonElement.classList.remove('liked');
        countElement.textContent = currentCount - 1;
        delete likedPrompts[promptId];
        showAlert("Removed from Favorites!", 'warning');
    } else {
        updateValue = 1;
        buttonElement.classList.add('liked'); 
        buttonElement.classList.add('liked-pop'); 
        countElement.textContent = currentCount + 1;
        likedPrompts[promptId] = true;
        showAlert("Added to Favorites!", 'success');
        
        setTimeout(() => {
            buttonElement.classList.remove('liked-pop');
        }, 400); 
    }
    
    localStorage.setItem('likedPrompts', JSON.stringify(likedPrompts));

    if (updateValue !== 0) {
        try {
            await db.ref(`prompts/${promptId}/likes`).transaction((currentLikes) => {
                const newLikes = (currentLikes || 0) + updateValue;
                return newLikes >= 0 ? newLikes : 0; 
            });
            sortPrompts(currentSort);
            if (favoritesPage.style.display !== 'none') {
                renderFavorites();
            }
            if (profilePage.style.display !== 'none') {
                 renderProfileView(CURRENT_AUTHOR_KEY); 
            }
        } catch (error) {
            console.error("Firebase update failed:", error);
        }
    }
}

// --- CLICK COUNT LOGIC ---
function getClickData() {
    const clicks = localStorage.getItem('promptClicks');
    return clicks ? JSON.parse(clicks) : {};
}

function incrementClickCount(id) {
    const clickData = getClickData();
    clickData[id] = (clickData[id] || 0) + 1; 
    localStorage.setItem('promptClicks', JSON.stringify(clickData));
}

// --- DATA LOADING & INITIALIZATION ---
async function renderListingPage() {
    showLoader(true);
    setProgress(50); 
    
    try {
        const snapshot = await db.ref('prompts').once('value');
        const promptsObject = snapshot.val();
        
        setProgress(80); 
        
        if (!promptsObject) {
            listingPage.innerHTML = `<p class="loading-text" style="grid-column: 1 / -1; font-size: 1.2rem; text-align: center; color:#ff6b6b; padding-top: 50px;">No prompts available yet! Database is empty.</p>`;
            setProgress(100);
            setTimeout(() => setProgress(0), 300); 
            return;
        }

        allPrompts = Object.keys(promptsObject).map(key => ({
            id: key, 
            ...promptsObject[key] 
        }));
        
        currentSort = 'latest';
        
        // Initial sorting based on default logic (Latest)
        sortPrompts(currentSort); 

        setProgress(100); 
        setTimeout(() => {
            setProgress(0);
            // CRITICAL: Call routing handler AFTER data is loaded to handle direct links (e.g. /post-name)
            handleRouting();
        }, 300); 

    } catch (error) {
        console.error("Firebase Connection Error:", error);
        listingPage.innerHTML = `<p class="loading-text" style="grid-column: 1 / -1; font-size: 1.2rem; text-align: center; color:#ff6b6b; padding-top: 50px;">🔴 ERROR: Could not connect to Firebase.<br>(${error.message})</p>`;
        setProgress(100);
        setTimeout(() => setProgress(0), 300); 
    }
}

async function copyPrompt(text) {
    const copyBtn = document.getElementById('copy-btn');
    
    const showCopySuccess = () => {
        copyBtn.classList.add('copied');
        copyBtn.classList.add('animate');
        copiedAlert.style.display = 'block'; 

        setTimeout(() => {
            copyBtn.classList.remove('animate'); 
            setTimeout(() => {
                copiedAlert.style.display = 'none'; 
                copyBtn.classList.remove('copied'); 
            }, 200); 
        }, 2500); 
    };

    const doCopy = async () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                console.error('Clipboard API copy failed, falling back:', err);
            }
        }
        
        if (document.execCommand) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                return true;
            } catch (err) {
                console.error('Fallback copy failed:', err);
                return false;
            } finally {
                document.body.removeChild(textarea);
            }
        }
        return false; 
    }

    const copySuccessful = await doCopy();

    if (copySuccessful) {
        showCopySuccess();
    } else {
        showAlert("Copy Failed! Try manually.", 'error', 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadThemePreference(); 
    renderListingPage();   
});