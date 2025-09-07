import React from "react";
import { useNavigate } from "react-router-dom";
import "./SectionCard.css";

const SectionCard = ({ title, products }) => {
  const navigate = useNavigate();

  return (
    <div className="section-card">
      <h2 className="section-title">{title}</h2>
      <div className="section-products">
        {products.map((p) => (
          <div
            key={p.id}
            className="section-product"
            onClick={() => navigate(`/product/${p.id}`)}
          >
            <img src={p.image_gallery?.[0] || "/placeholder.jpg"} alt={p.name} />
            <div className="product-info">
              <h3>{p.name}</h3>
              <p>KSH {Number(p.price).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SectionCard;
