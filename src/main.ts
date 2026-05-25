import "./style.css";

interface Project {
  title: string;
  description: string;
  image: string; // e.g. "/images/project1.jpg"
  link: string; // e.g. "https://github.com/yourusername/project1"
}

const projects: Project[] = [];

function renderProjects(): void {
  const section = document.querySelector(".projects-section") as HTMLElement | null;
  const grid = document.getElementById("projects-grid");
  if (!section || !grid) return;

  if (projects.length === 0) {
    section.style.display = "none";
    return;
  }

  projects.forEach((project) => {
    const card = document.createElement("a");
    card.href = project.link;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    card.className = "project-card";

    card.innerHTML = `
      <img src="${project.image}" alt="${project.title}" class="project-image" />
      <div class="project-content">
        <h3>${project.title}</h3>
        <p>${project.description}</p>
      </div>
    `;

    grid.appendChild(card);
  });
}

renderProjects();
