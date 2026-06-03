// API base URL — set this once AWS API Gateway is live
const API_BASE = window.API_BASE || '';

async function apiFetch(path, options = {}, email) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-email': email,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }

  return res.status === 204 ? null : res.json();
}

export async function listRecipes(email) {
  const data = await apiFetch('/recipes', {}, email);
  return data.recipes;
}

export async function createRecipe(email, recipe) {
  return apiFetch('/recipes', {
    method: 'POST',
    body: JSON.stringify(recipe),
  }, email);
}

export async function deleteRecipe(email, recipeId) {
  return apiFetch(`/recipes/${recipeId}`, { method: 'DELETE' }, email);
}

export async function getUploadUrl(email, filename) {
  return apiFetch(`/recipes/upload-url?filename=${encodeURIComponent(filename)}`, {}, email);
}

export async function uploadToS3(uploadUrl, file) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`S3 upload failed: ${res.status}`);
  }
}
