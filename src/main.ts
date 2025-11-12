import "./style.css";

interface Project {
  title: string;
  description: string;
  image: string;
  link: string;
}

const projects: Project[] = [
  {
    title: "Project One",
    description:
      "A brief description of your first project and what makes it interesting.",
    image: "/images/project1.jpg",
    link: "https://github.com/yourusername/project1",
  },
  {
    title: "Project Two",
    description:
      "A brief description of your second project and its key features.",
    image: "/images/project2.jpg",
    link: "https://github.com/yourusername/project2",
  },
  {
    title: "Project Three",
    description:
      "A brief description of your third project and what you built.",
    image: "/images/project3.jpg",
    link: "https://github.com/yourusername/project3",
  },
];

function renderProjects(): void {
  const grid = document.getElementById("projects-grid");
  if (!grid) return;

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
