import { TUTORIAL_TRANSLATIONS } from '../../utils/translations';

export default function TutorialOverlay({ showTutorial, setShowTutorial, tutorialStep, setTutorialStep, appLang }) {
  if (!showTutorial) return null;

  return (
    <div className="tutorial-modal-overlay">
      <div className="tutorial-modal-card">
        <div className="tutorial-icon-circle">
          {(TUTORIAL_TRANSLATIONS[appLang] || TUTORIAL_TRANSLATIONS.en).steps[tutorialStep].icon}
        </div>
        <h3 className="tutorial-step-title">
          {(TUTORIAL_TRANSLATIONS[appLang] || TUTORIAL_TRANSLATIONS.en).steps[tutorialStep].title}
        </h3>
        <p className="tutorial-step-desc">
          {(TUTORIAL_TRANSLATIONS[appLang] || TUTORIAL_TRANSLATIONS.en).steps[tutorialStep].desc}
        </p>
        
        <div className="tutorial-dots">
          {(TUTORIAL_TRANSLATIONS[appLang] || TUTORIAL_TRANSLATIONS.en).steps.map((_, idx) => (
            <div 
              key={idx} 
              className={`tutorial-dot ${idx === tutorialStep ? 'active' : ''}`}
            />
          ))}
        </div>
        
        <div className="tutorial-actions">
          {tutorialStep < 3 ? (
            <>
              <button 
                type="button" 
                className="tutorial-btn-skip"
                onClick={() => {
                  setShowTutorial(false);
                  localStorage.setItem('fsa_carpenter_tutorial_completed', 'true');
                }}
              >
                {(TUTORIAL_TRANSLATIONS[appLang] || TUTORIAL_TRANSLATIONS.en).skip}
              </button>
              <button 
                type="button" 
                className="tutorial-btn-next"
                onClick={() => setTutorialStep(prev => prev + 1)}
              >
                {(TUTORIAL_TRANSLATIONS[appLang] || TUTORIAL_TRANSLATIONS.en).next}
              </button>
            </>
          ) : (
            <button 
              type="button" 
              className="tutorial-btn-next"
              style={{ width: '100%' }}
              onClick={() => {
                setShowTutorial(false);
                localStorage.setItem('fsa_carpenter_tutorial_completed', 'true');
              }}
            >
              {(TUTORIAL_TRANSLATIONS[appLang] || TUTORIAL_TRANSLATIONS.en).finish}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
