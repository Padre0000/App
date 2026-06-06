import React, { useState } from 'react';
import './SelectPreferences.css';

const SelectPreferences = ({ onPreferencesSelected }) => {
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    { id: 'supermarket', name: '🛒 سوبر ماركت', icon: '🛒' },
    { id: 'small-shop', name: '🏪 محل صغير', icon: '🏪' },
    { id: 'clothing', name: '👕 ملابس', icon: '👕' },
    { id: 'building-materials', name: '🏗️ مواد البناء', icon: '🏗️' },
    { id: 'electronics', name: '📱 إلكترونيات', icon: '📱' },
    { id: 'food', name: '🍽️ غذاء', icon: '🍽️' },
    { id: 'pharmacy', name: '⚕️ صيدلية', icon: '⚕️' },
    { id: 'furniture', name: '🛋️ أثاث', icon: '🛋️' }
  ];

  const togglePreference = (id) => {
    if (preferences.includes(id)) {
      setPreferences(preferences.filter(p => p !== id));
    } else {
      setPreferences([...preferences, id]);
    }
  };

  const handleSubmit = async () => {
    if (preferences.length === 0) {
      setError('يرجى اختيار فئة واحدة على الأقل');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/users/select-preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ preferences })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save preferences');
      }

      localStorage.setItem('user', JSON.stringify(data.user));
      onPreferencesSelected(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="preferences-container">
      <div className="preferences-card">
        <h1>اختر الفئات المفضلة</h1>
        <p>اختر الفئات التي تهمك لتحسين تجربتك</p>

        {error && <div className="error-message">{error}</div>}

        <div className="categories-grid">
          {categories.map(category => (
            <div
              key={category.id}
              className={`category-item ${preferences.includes(category.id) ? 'selected' : ''}`}
              onClick={() => togglePreference(category.id)}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
              {preferences.includes(category.id) && (
                <span className="checkmark">✓</span>
              )}
            </div>
          ))}
        </div>

        <div className="button-group">
          <button
            className="btn-cancel"
            onClick={() => onPreferencesSelected(null, true)}
          >
            تخطي
          </button>
          <button
            className="btn-submit"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'جاري المعالجة...' : 'متابعة'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectPreferences;
