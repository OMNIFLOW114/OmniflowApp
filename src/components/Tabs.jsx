import React, { useState } from "react";
import { motion } from "framer-motion";

const Tabs = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(0);
  const tabIdBase = "omni-tab";

  return (
    <section className="ts-tabs-section">
      <div className="ts-tabs">
        {tabs.map((tab, index) => (
          <button
            key={`${tabIdBase}-${index}`}
            onClick={() => setActiveTab(index)}
            className={`ts-tab ${index === activeTab ? "active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div
        className="ts-tab-content ts-container"
        key={`${tabIdBase}-panel-${activeTab}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {tabs[activeTab].content}
      </motion.div>
    </section>
  );
};

export default Tabs;
