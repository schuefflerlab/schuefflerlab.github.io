---
layout: layout
title: Software
permalink: /software/
---

## Software

<style>
.software-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1rem;
}
.software-item {
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: #fff;
  padding: 1rem;
}
.software-link {
  display: flex;
  align-items: center;
  gap: 1rem;
  text-decoration: none;
  color: inherit;
}
.software-link img {
  width: 160px;
  max-width: 100%;
  border-radius: 0.75rem;
  display: block;
}
.software-link h3 {
  margin: 0 0 0.35rem;
}
.software-link p {
  margin: 0;
  color: #4b5563;
}
</style>

<ul class="software-list">
  <li class="software-item">
    <a class="software-link" href="{{ '/software/tum-slide-viewer/' | relative_url }}">
      <img src="{{ '/assets/images/software/tum-slide-viewer.jpg' | relative_url }}" alt="TUM Slide Viewer">
      <div>
        <h3>TUM Slide Viewer</h3>
        <p>Web-based digital pathology slide viewer for annotation and AI interaction.</p>
      </div>
    </a>
  </li>
  <li class="software-item">
    <a class="software-link" href="{{ '/software/tmarker/' | relative_url }}">
      <img src="{{ '/assets/images/software/tmarker.png' | relative_url }}" alt="TMARKER">
      <div>
        <h3>TMARKER</h3>
        <p>Tissue microarray analysis tool for nucleus counting and staining estimation.</p>
      </div>
    </a>
  </li>
  <li class="software-item">
    <a class="software-link" href="{{ 'https://github.com/schuefflerlab/' }}">
      <div>
        <h3>More on GitHub</h3>
      </div>
    </a>
  </li>
</ul>
