import os

file_path = r"d:\Anti Gravity\Field_Service_App\src\components\CarpenterPortal.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []

imports = """import { useState, useEffect, useRef } from 'react';
import { 
  CheckSquare, 
  CreditCard, 
  HelpCircle,
  Moon, 
  Sun,
  LayoutDashboard,
  Lock,
  MessageCircle,
  Send,
  AlertTriangle
} from 'lucide-react';
import { stateManager, triggerN8nWebhook, fsaQueries } from '../utils/stateManager';
import { useQuery } from '@tanstack/react-query';
import { getTranslation } from '../utils/translations';
import { captureAndStampPhoto } from '../utils/photoStamper';

import './CarpenterPortal.css';

import TutorialOverlay from './carpenter/TutorialOverlay';
import CarpenterDashboard from './carpenter/CarpenterDashboard';
import CarpenterJobList from './carpenter/CarpenterJobList';
import CarpenterWallet from './carpenter/CarpenterWallet';
import CarpenterJobDetail from './carpenter/CarpenterJobDetail';
"""

# Extract from line 213 (index 212) up to 1146 (index 1145) where MAIN SCROLL VIEW starts
state_and_handlers = "".join(lines[212:1145])

render_start = """
          {/* DASHBOARD TAB OVERVIEW */}
          {activeTab === 'dashboard' && (
            <CarpenterDashboard 
              availability={availability}
              setAvailability={setAvailability}
              jobs={jobs}
              carpenterName={carpenterName}
              setActiveTab={setActiveTab}
              setSelectedJobId={setSelectedJobId}
            />
          )}

          {/* JOB LIST / DASHBOARD VIEW */}
          {activeTab === 'jobs' && !selectedJobId && (
            <CarpenterJobList
              carpenterName={carpenterName}
              activeJobs={activeJobs}
              walletSummary={walletSummary}
              jobs={jobs}
              activeUser={activeUser}
              setSelectedJobId={setSelectedJobId}
            />
          )}

          {/* WALLET VIEW */}
          {activeTab === 'wallet' && !selectedJobId && (
            <CarpenterWallet
              walletSummary={walletSummary}
              directJobId={directJobId}
              handleResetDemo={handleResetDemo}
              t={t}
            />
          )}

          {/* JOB DETAIL SCREEN */}
          {selectedJobId && job && (
            <CarpenterJobDetail
              job={job}
              directJobId={directJobId}
              setEnteredOtp={setEnteredOtp}
              setOtpError={setOtpError}
              getMaskedValue={getMaskedValue}
              t={t}
              isCompletedMoreThan24Hours={isCompletedMoreThan24Hours}
              setShowRejectForm={setShowRejectForm}
              handleStartTransit={handleStartTransit}
              getWhatsAppShareLink={getWhatsAppShareLink}
              carpenterName={carpenterName}
              stateManager={stateManager}
              refetchJobs={refetchJobs}
              handleChecklistToggle={handleChecklistToggle}
              uploadingPhoto={uploadingPhoto}
              handleClearPhoto={handleClearPhoto}
              handlePhotoChange={handlePhotoChange}
              handleMockPhoto={handleMockPhoto}
              showDamageForm={showDamageForm}
              setShowDamageForm={setShowDamageForm}
              damagePartName={damagePartName}
              setDamagePartName={setDamagePartName}
              damageNotes={damageNotes}
              setDamageNotes={setDamageNotes}
              damagePhotos={damagePhotos}
              compressingDamage={compressingDamage}
              setCompressingDamage={setCompressingDamage}
              setDamagePhotos={setDamagePhotos}
              selectedJobId={selectedJobId}
              handleMockDamagePhoto={handleMockDamagePhoto}
              handleDamageSubmit={handleDamageSubmit}
              showExtraChargeForm={showExtraChargeForm}
              setShowExtraChargeForm={setShowExtraChargeForm}
              chargeType={chargeType}
              setChargeType={setChargeType}
              chargeAmount={chargeAmount}
              setChargeAmount={setChargeAmount}
              chargeNotes={chargeNotes}
              setChargeNotes={setChargeNotes}
              chargeReceipt={chargeReceipt}
              setChargeReceipt={setChargeReceipt}
              handleMockReceiptPhoto={handleMockReceiptPhoto}
              handleExtraChargeSubmit={handleExtraChargeSubmit}
              isReadyToComplete={isReadyToComplete}
              handleSendOtp={handleSendOtp}
              enteredOtp={enteredOtp}
              handleVerifyOtp={handleVerifyOtp}
              otpError={otpError}
              resendCooldown={resendCooldown}
              handleSendPreClosureFeedback={handleSendPreClosureFeedback}
              handleSignatureSave={handleSignatureSave}
              handleSendFeedbackWhatsApp={handleSendFeedbackWhatsApp}
              newCommentText={newCommentText}
              setNewCommentText={setNewCommentText}
              handleSendComment={handleSendComment}
              commentsEndRef={commentsEndRef}
            />
          )}
"""

reject_modal = "".join(lines[2382:2433]) # 2383 is {/* Reject / Skip Order Modal */}

bottom_nav_and_tutorial = """
        {/* BOTTOM TAB NAV BAR */}
        {!directJobId && !isKeyboardVisible && (
          <nav className="app-bottom-nav">
            <button 
              type="button" 
              className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('dashboard');
                setSelectedJobId(null);
              }}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </button>

            <button 
              type="button" 
              className={`nav-tab-btn ${activeTab === 'jobs' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('jobs');
                setSelectedJobId(null); // Go back to list when tab toggles
              }}
            >
              <CheckSquare size={18} />
              <span>Jobs</span>
            </button>
            
            <button 
              type="button" 
              className={`nav-tab-btn ${activeTab === 'wallet' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('wallet');
                setSelectedJobId(null); // Go back to list when tab toggles
              }}
            >
              <CreditCard size={18} />
              <span>Wallet</span>
            </button>
          </nav>
        )}

        <TutorialOverlay 
          showTutorial={showTutorial}
          setShowTutorial={setShowTutorial}
          tutorialStep={tutorialStep}
          setTutorialStep={setTutorialStep}
          appLang={appLang}
        />

      </>
    )}
  </div>
</div>
);
}
"""

with open(file_path, "w", encoding="utf-8") as f:
    f.write(imports)
    f.write(state_and_handlers)
    f.write(render_start)
    f.write(reject_modal)
    f.write(bottom_nav_and_tutorial)

print("Done refactoring CarpenterPortal.jsx")
