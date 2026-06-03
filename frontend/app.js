import { listRecipes, createRecipe, deleteRecipe, getUploadUrl, uploadToS3 } from './api.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const EMAIL_KEY = 'rcb_user_email';
const CLOUDFRONT_BASE = window.CLOUDFRONT_BASE || '';

// ─── DOM references ───────────────────────────────────────────────────────────

const recipeForm = document.getElementById('recipeForm');
const submitButton = recipeForm.querySelector('[type="submit"]');
const recipesContainer = document.getElementById('recipesContainer');
const searchInput = document.getElementById('searchInput');
const listStatus = document.getElementById('listStatus');

// ─── Email identity ───────────────────────────────────────────────────────────

document.getElementById('emailContinueBtn').addEventListener('click', submitEmail);
document.getElementById('emailInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitEmail();
});

let currentEmail = localStorage.getItem(EMAIL_KEY);
if (currentEmail) {
  renderBadge(currentEmail);
  initApp(currentEmail);
} else {
  showEmailModal();
}

function showEmailModal() {
  const input = document.getElementById('emailInput');
  input.value = '';
  document.getElementById('emailModal').hidden = false;
  input.focus();
}

function submitEmail() {
  const input = document.getElementById('emailInput');
  if (!input.checkValidity() || !input.value.trim()) {
    input.focus();
    return;
  }
  currentEmail = input.value.trim();
  localStorage.setItem(EMAIL_KEY, currentEmail);
  document.getElementById('emailModal').hidden = true;
  renderBadge(currentEmail);
  initApp(currentEmail);
}

function renderBadge(email) {
  const badge = document.getElementById('userBadge');
  badge.innerHTML = `Logged in as: <strong>${escapeHtml(email)}</strong> · <a href="#" class="change-link">Change</a>`;
  badge.querySelector('.change-link').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem(EMAIL_KEY);
    currentEmail = null;
    badge.innerHTML = '';
    recipesContainer.innerHTML = '';
    showEmailModal();
  });
}

// ─── App init (runs after email is confirmed) ─────────────────────────────────

function initApp(email) {
  loadRecipeList(email);
  setupForm(email);
  searchInput.addEventListener('input', () => renderRecipes(allRecipes, searchInput.value));
}

// ─── Issue #4 — List recipes ──────────────────────────────────────────────────

let allRecipes = [];

async function loadRecipeList(email) {
  listStatus.textContent = 'Loading recipes…';
  try {
    allRecipes = await listRecipes(email);
    listStatus.textContent = '';
    renderRecipes(allRecipes, searchInput.value);
  } catch (err) {
    console.error('Failed to load recipes', err);
    listStatus.textContent = 'Could not load recipes. Check your connection.';
  }
}

// ─── Issue #5 — Create recipe ─────────────────────────────────────────────────

function setupForm(email) {
  recipeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(recipeForm);
    const imageFile = formData.get('image');

    setFormStatus('Saving recipe…', true);

    try {
      let imageKey = '';

      // Issue #6 — Image upload (integrated here)
      if (imageFile && imageFile.size > 0) {
        setFormStatus('Uploading image…', true);
        const recipeId = crypto.randomUUID();
        const { uploadUrl, imageKey: key } = await getUploadUrl(email, imageFile.name);
        await uploadToS3(uploadUrl, imageFile);
        imageKey = key;

        setFormStatus('Saving recipe…', true);
        await createRecipe(email, {
          recipeId,
          name: formData.get('name').trim(),
          category: formData.get('category'),
          prepTime: formData.get('prepTime').trim(),
          ingredients: formData.get('ingredients').trim(),
          instructions: formData.get('instructions').trim(),
          createdAt: new Date().toISOString(),
          imageKey,
        });
      } else {
        await createRecipe(email, {
          recipeId: crypto.randomUUID(),
          name: formData.get('name').trim(),
          category: formData.get('category'),
          prepTime: formData.get('prepTime').trim(),
          ingredients: formData.get('ingredients').trim(),
          instructions: formData.get('instructions').trim(),
          createdAt: new Date().toISOString(),
        });
      }

      setFormStatus('Recipe saved!', false);
      recipeForm.reset();
      await loadRecipeList(email);
      setTimeout(() => setFormStatus('', false), 3000);
    } catch (err) {
      console.error('Failed to save recipe', err);
      setFormStatus('Failed to save recipe. Please try again.', false);
    }
  });
}

function setFormStatus(message, disableSubmit) {
  submitButton.disabled = disableSubmit;
  submitButton.textContent = disableSubmit ? message : 'Add Recipe';
  if (!disableSubmit && message) {
    const statusEl = recipeForm.querySelector('.form-status') || (() => {
      const el = document.createElement('p');
      el.className = 'form-status';
      recipeForm.insertBefore(el, submitButton);
      return el;
    })();
    statusEl.textContent = message;
  } else {
    const statusEl = recipeForm.querySelector('.form-status');
    if (statusEl) statusEl.textContent = '';
  }
}

// ─── Issue #7 — Delete recipe ─────────────────────────────────────────────────

async function handleDelete(recipeId, buttonEl) {
  buttonEl.disabled = true;
  buttonEl.textContent = 'Deleting…';
  try {
    await deleteRecipe(currentEmail, recipeId);
    allRecipes = allRecipes.filter((r) => r.recipeId !== recipeId);
    renderRecipes(allRecipes, searchInput.value);
  } catch (err) {
    console.error('Failed to delete recipe', err);
    buttonEl.disabled = false;
    buttonEl.textContent = 'Delete';
  }
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderRecipes(items, query = '') {
  const filtered = filterRecipes(items, query);
  recipesContainer.innerHTML = '';

  if (filtered.length === 0) {
    recipesContainer.innerHTML = `<div class="recipe-card"><p>No recipes found. Add a recipe to get started.</p></div>`;
    return;
  }

  filtered.forEach((recipe) => {
    const card = document.createElement('article');
    card.className = 'recipe-card';

    const imageHtml = recipe.imageKey
      ? `<img src="${CLOUDFRONT_BASE}/images/${encodeURIComponent(recipe.imageKey)}" alt="Recipe image for ${escapeHtml(recipe.name)}" />`
      : '';

    card.innerHTML = `
      ${imageHtml}
      <div class="recipe-meta">
        <span>${escapeHtml(recipe.category)}</span>
        <span>${escapeHtml(recipe.prepTime)}</span>
        <span>${formatDate(recipe.createdAt)}</span>
      </div>
      <h3>${escapeHtml(recipe.name)}</h3>
      <section class="recipe-section">
        <h4>Ingredients</h4>
        <pre>${escapeHtml(recipe.ingredients)}</pre>
      </section>
      <section class="recipe-section">
        <h4>Instructions</h4>
        <pre>${escapeHtml(recipe.instructions)}</pre>
      </section>
      <footer>
        <button class="delete-button">Delete</button>
      </footer>
    `;

    card.querySelector('.delete-button').addEventListener('click', (e) => {
      handleDelete(recipe.recipeId, e.currentTarget);
    });

    recipesContainer.appendChild(card);
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function filterRecipes(items, query) {
  const term = (query || '').trim().toLowerCase();
  if (!term) return [...items];
  return items.filter((r) =>
    r.name.toLowerCase().includes(term) || r.category.toLowerCase().includes(term)
  );
}

function formatDate(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
