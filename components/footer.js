class FooterComponent extends HTMLElement {
  connectedCallback() {
    const footer = document.createElement('footer');
    const p = document.createElement('p');
    p.textContent = 'EcoTrack Pro helps households measure, forecast, and reduce carbon habits with privacy-first local data.';
    footer.appendChild(p);
    this.appendChild(footer);
  }
}

customElements.define("app-footer", FooterComponent);
