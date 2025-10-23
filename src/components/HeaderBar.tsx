import { useNavigate } from 'react-router-dom';

export function HeaderBar() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/');
  };

  return (
    <header className="config-header">
      <button
        onClick={handleBack}
        className="btn-back"
      >
        <span className="btn-back-arrow">←</span>
        Back
      </button>
      <h1
        className="brand-title"
        onClick={() => navigate('/')}
      >
        didah
      </h1>
    </header>
  );
}