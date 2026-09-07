import React from 'react'
import './HomePage.css'

export default function HomePage() {
  return (
    <div className="pea-landing"> 
      <header className="pea-navbar">
        <div className="pea-navbar-inner">
          <div className="pea-logo">proenglish</div>
          <nav className="pea-navlinks">
            <a href="#">SERVICIOS</a>
            <a href="#">OFERTAS</a>
            <a href="#">¿ERES PROFESOR?</a>
            <a className="pea-enter" href="#">ENTRAR</a>
          </nav>
        </div>
      </header>

      <section className="pea-hero">
        <div className="pea-hero-overlay">
          <div className="pea-hero-content">
            <h1>Encuentra las mejores Clases de Inglés con Profesores Nativos</h1>
            <hr className="hero-divider" />

            <div className="quote-card">
              <div className="quote-left">
                <label className="label">Indica la cantidad de horas semanales:</label>
                <div className="hours-input">
                  <input type="number" min="1" max="40" defaultValue="2" />
                  <span className="hours-suffix">hrs/sem</span>
                </div>
              </div>
              <div className="quote-right">
                <div className="price-label">Tu cotización es de:</div>
                <div className="price-value"><span className="currency">$</span> 25.00</div>
                <button className="btn-orange">RESERVAR MI CLASE</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="pea-breadcrumbs">Inicio / Clases de Inglés / Profesores Nativos</div>

      <section className="pea-benefits">
        <h2>¿Por qué estudiar en Pro English Academy?</h2>
        <div className="benefit-grid">
          <div className="benefit-item">
            <div className="icon-circle">$
            </div>
            <h3>Es gratis</h3>
            <p>Accede a información básica y encuentra profesores sin costo.</p>
          </div>

          <div className="benefit-item">
            <div className="icon-circle">≋</div>
            <h3>Compara precios</h3>
            <p>Compara tarifas y elige la mejor opción para tu presupuesto.</p>
          </div>

          <div className="benefit-item">
            <div className="icon-circle">✓</div>
            <h3>Reserva con confianza</h3>
            <p>Reserva y recibe confirmaciones y recordatorios automáticos.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
