import React from 'react';

const Hero = ({ title, subtitle, buttonText, buttonLink }) => {
  return (
    <section className="hero">
      <div className="hero-content">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {buttonText && (
          <a href={buttonLink} className="cta-button">
            {buttonText}
          </a>
        )}
      </div>
    </section>
  );
};

export default Hero;