import React from 'react';

const ProductCard = ({ title, description, image, price }) => {
  return (
    <div className="product-card">
      <img src={image} alt={title} className="card-image" />
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="price-tag">${price}</div>
      <button className="cta-button">View Details</button>
    </div>
  );
};

export default ProductCard;