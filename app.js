const recipeForm = document.getElementById('recipeForm');
const recipesContainer = document.getElementById('recipesContainer');
const searchInput = document.getElementById('searchInput');

const STORAGE_KEY = 'recipeCloudBookRecipes';

// Load recipes from localStorage when the page loads
const recipes = loadRecipes();
let filteredRecipes = [...recipes];

renderRecipes(filteredRecipes);

// Add recipe form submit handler
recipeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(recipeForm);

  const newRecipe = {
    id: crypto.randomUUID(),
    name: formData.get('name').trim(),
    category: formData.get('category'),
    prepTime: formData.get('prepTime').trim(),
    ingredients: formData.get('ingredients').trim(),
    instructions: formData.get('instructions').trim(),
    createdAt: new Date().toISOString(),
    imageData: await loadImageData(formData.get('image')),
  };

  recipes.push(newRecipe);
  saveRecipes(recipes);
  filteredRecipes = filterRecipes(recipes, searchInput.value);
  renderRecipes(filteredRecipes);
  recipeForm.reset();
});

searchInput.addEventListener('input', () => {
  filteredRecipes = filterRecipes(recipes, searchInput.value);
  renderRecipes(filteredRecipes);
});

// Load recipe collection from localStorage or return an empty array
function loadRecipes() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return [];
  }
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error('Unable to load saved recipes', error);
    return [];
  }
}

// Save recipe collection to localStorage
function saveRecipes(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// Convert an uploaded image file into a base64 data URL
function loadImageData(file) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      resolve('');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => {
      console.warn('Image load failed, skipping image');
      resolve('');
    };
    reader.readAsDataURL(file);
  });
}

// Filter recipes by name or category based on search text
function filterRecipes(items, query) {
  const term = query.trim().toLowerCase();
  if (!term) {
    return [...items];
  }

  return items.filter((recipe) => {
    const nameMatch = recipe.name.toLowerCase().includes(term);
    const categoryMatch = recipe.category.toLowerCase().includes(term);
    return nameMatch || categoryMatch;
  });
}

// Render recipe cards inside the page
function renderRecipes(items) {
  recipesContainer.innerHTML = '';

  if (items.length === 0) {
    recipesContainer.innerHTML = `<div class="recipe-card"><p>No recipes found. Add a recipe to get started.</p></div>`;
    return;
  }

  items.forEach((recipe) => {
    const card = document.createElement('article');
    card.className = 'recipe-card';

    card.innerHTML = `
      ${recipe.imageData ? `<img src="${recipe.imageData}" alt="Recipe image for ${escapeHtml(recipe.name)}" />` : ''}
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
        <button class="delete-button" data-id="${recipe.id}">Delete</button>
      </footer>
    `;

    const deleteButton = card.querySelector('.delete-button');
    deleteButton.addEventListener('click', () => deleteRecipe(recipe.id));

    recipesContainer.appendChild(card);
  });
}

// Remove a recipe by ID and re-render the list
function deleteRecipe(recipeId) {
  const index = recipes.findIndex((item) => item.id === recipeId);
  if (index === -1) {
    return;
  }

  recipes.splice(index, 1);
  saveRecipes(recipes);
  filteredRecipes = filterRecipes(recipes, searchInput.value);
  renderRecipes(filteredRecipes);
}

// Format ISO date to a friendly string
function formatDate(isoString) {
  if (!isoString) {
    return '';
  }
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Escape HTML values in text content to prevent injection
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Placeholder for future cloud integration logic
// Later, this can be replaced with API calls to AWS API Gateway + Lambda + DynamoDB + S3.
function syncRecipesToCloud() {
  // Example: call API Gateway endpoint with recipe payloads
}
