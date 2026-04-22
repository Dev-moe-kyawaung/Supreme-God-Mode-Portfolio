let config = {};
let allRepos = [];
let username = "";
let repoModal;

async function loadConfig() {
  const response = await fetch("config.json");
  if (!response.ok) throw new Error("Config load failed");
  config = await response.json();
  username = config.githubUsername;
}

function startTypewriter(texts) {
  const el = document.getElementById("typewriter");
  let textIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  function type() {
    const current = texts[textIndex];
    el.textContent = current.substring(0, charIndex);

    if (!isDeleting && charIndex < current.length) {
      charIndex++;
      setTimeout(type, 80);
    } else if (isDeleting && charIndex > 0) {
      charIndex--;
      setTimeout(type, 40);
    } else {
      isDeleting = !isDeleting;
      if (!isDeleting) textIndex = (textIndex + 1) % texts.length;
      setTimeout(type, 900);
    }
  }
  type();
}

function renderSkills(skills) {
  const container = document.getElementById("skillsContainer");
  container.innerHTML = skills.map(skill => `<span class="skill-pill">${skill}</span>`).join("");
}

async function fetchGitHubProfile() {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`);
    if (!response.ok) throw new Error("Profile fetch failed");
    const user = await response.json();

    document.getElementById("avatar").src = user.avatar_url;
    document.getElementById("name").textContent = user.name || user.login;
    document.getElementById("username").textContent = "@" + user.login;
    document.getElementById("bio").textContent = user.bio || "No bio available.";
    setCounter("reposCount", user.public_repos);
    setCounter("followersCount", user.followers);
    setCounter("followingCount", user.following);
    document.getElementById("locationText").textContent = user.location || "-";
    document.getElementById("aboutUsername").textContent = user.login;
    document.getElementById("emailText").textContent = user.email || "Not Public";

    document.getElementById("githubProfileBtn").href = user.html_url;
    document.getElementById("profileUrlText").href = user.html_url;
    document.getElementById("profileUrlText").textContent = user.html_url;
    document.getElementById("contactGithub").href = user.html_url;

    if (user.blog && user.blog.trim()) {
      let blog = user.blog;
      if (!blog.startsWith("http")) blog = "https://" + blog;
      document.getElementById("blogBtn").href = blog;
      document.getElementById("blogBtn").classList.remove("d-none");
      document.getElementById("contactWebsite").href = blog;
      document.getElementById("contactWebsite").textContent = blog;
    }

    document.getElementById("cvBtn").href = config.cvUrl;
    document.getElementById("contactCv").href = config.cvUrl;
  } catch (error) {
    showError("Profile data could not be loaded.");
  }
}

async function fetchRepositories() {
  try {
    const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`);
    if (!response.ok) throw new Error("Repo fetch failed");
    const repos = await response.json();

    allRepos = repos.filter(repo => !repo.fork);
    document.getElementById("loadingRepos").style.display = "none";

    renderFeaturedRepos(allRepos);
    renderLanguageOptions(allRepos);
    renderRepositories(allRepos);
  } catch (error) {
    document.getElementById("loadingRepos").style.display = "none";
    showError("Repositories could not be loaded. Check API rate limit.");
  }
}

function renderFeaturedRepos(repos) {
  const featured = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 3);
  document.getElementById("featuredRepos").innerHTML = featured.map(repo => repoTemplate(repo, true)).join("");
  attachRepoModalEvents();
}

function renderRepositories(repos) {
  const container = document.getElementById("reposContainer");
  if (!repos.length) {
    container.innerHTML = `<div class="col-12"><div class="error-box">No repositories match your filter.</div></div>`;
    return;
  }
  container.innerHTML = repos.map(repo => repoTemplate(repo)).join("");
  attachRepoModalEvents();
}

function repoTemplate(repo, featured = false) {
  return `
    <div class="${featured ? "col-md-4" : "col-md-6 col-xl-4"}">
      <div class="repo-card">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <h4 class="h5 fw-bold mb-0">${repo.name}</h4>
          <span class="small-pill">${repo.visibility || "public"}</span>
        </div>
        <p class="repo-description">${repo.description || "No description provided for this repository."}</p>
        <div class="d-flex flex-wrap gap-2 mb-3">
          ${repo.language ? `<span class="repo-badge">${repo.language}</span>` : ""}
          <span class="small-pill"><i class="bi bi-star me-1"></i>${repo.stargazers_count}</span>
          <span class="small-pill"><i class="bi bi-diagram-3 me-1"></i>${repo.forks_count}</span>
        </div>
        <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap">
          <small class="text-muted-custom">Updated: ${new Date(repo.updated_at).toLocaleDateString()}</small>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-premium repo-detail-btn" data-repo='${JSON.stringify(repo).replace(/'/g, "&apos;")}'>
              Details
            </button>
            <a href="${repo.html_url}" target="_blank" class="btn btn-sm btn-premium">View Repo</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function attachRepoModalEvents() {
  document.querySelectorAll(".repo-detail-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const repo = JSON.parse(btn.getAttribute("data-repo").replace(/&apos;/g, "'"));
      openRepoModal(repo);
    });
  });
}

function openRepoModal(repo) {
  document.getElementById("repoModalLabel").textContent = repo.name;
  document.getElementById("repoModalBody").innerHTML = `
    <p><strong>Description:</strong> ${repo.description || "No description available."}</p>
    <p><strong>Language:</strong> ${repo.language || "N/A"}</p>
    <p><strong>Stars:</strong> ${repo.stargazers_count}</p>
    <p><strong>Forks:</strong> ${repo.forks_count}</p>
    <p><strong>Visibility:</strong> ${repo.visibility || "public"}</p>
    <p><strong>Created:</strong> ${new Date(repo.created_at).toLocaleString()}</p>
    <p><strong>Updated:</strong> ${new Date(repo.updated_at).toLocaleString()}</p>
    <a href="${repo.html_url}" target="_blank" class="btn btn-premium mt-2">Open Repository</a>
  `;
  repoModal.show();
}

function renderLanguageOptions(repos) {
  const select = document.getElementById("languageFilter");
  const languages = [...new Set(repos.map(r => r.language).filter(Boolean))].sort();
  languages.forEach(lang => {
    const option = document.createElement("option");
    option.value = lang;
    option.textContent = lang;
    select.appendChild(option);
  });
}

function applyFilters() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const language = document.getElementById("languageFilter").value;
  const sort = document.getElementById("sortFilter").value;

  let filtered = [...allRepos];

  if (search) {
    filtered = filtered.filter(repo =>
      repo.name.toLowerCase().includes(search) ||
      (repo.description && repo.description.toLowerCase().includes(search))
    );
  }

  if (language !== "all") {
    filtered = filtered.filter(repo => repo.language === language);
  }

  if (sort === "stars") {
    filtered.sort((a, b) => b.stargazers_count - a.stargazers_count);
  } else if (sort === "name") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    filtered.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }

  renderRepositories(filtered);
}

function setCounter(id, value) {
  const el = document.getElementById(id);
  let current = 0;
  const step = Math.ceil(value / 30);

  const timer = setInterval(() => {
    current += step;
    if (current >= value) {
      el.textContent = value;
      clearInterval(timer);
    } else {
      el.textContent = current;
    }
  }, 30);
}

function showError(message) {
  const errorBox = document.getElementById("errorMessage");
  errorBox.classList.remove("d-none");
  errorBox.innerHTML = `<div class="error-box">${message}</div>`;
}

function initTheme() {
  const saved = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
}

function bindEvents() {
  document.getElementById("themeToggle").addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });

  document.getElementById("searchInput").addEventListener("input", applyFilters);
  document.getElementById("languageFilter").addEventListener("change", applyFilters);
  document.getElementById("sortFilter").addEventListener("change", applyFilters);

  const form = document.getElementById("contactForm");
  form.addEventListener("submit", function () {
    document.getElementById("formNotice").classList.remove("d-none");
  });
}

async function init() {
  try {
    repoModal = new bootstrap.Modal(document.getElementById("repoModal"));
    initTheme();
    bindEvents();
    await loadConfig();
    startTypewriter(config.heroTexts || ["Developer"]);
    renderSkills(config.skills || []);
    await fetchGitHubProfile();
    await fetchRepositories();
  } catch (error) {
    showError("Application failed to initialize.");
  }
}

init();
