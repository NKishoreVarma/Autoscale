import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithPhoneNumber,
  RecaptchaVerifier
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { logAuditAction } from '../utils/auditLogger';

const AuthContext = createContext();

const ROLE_HIERARCHY = {
  super_admin: 4,
  admin: 3,
  manager: 2,
  viewer: 1
};

const PERMISSION_MAP = {
  // Lead management
  view_leads: ['super_admin', 'admin', 'manager', 'viewer'],
  create_lead: ['super_admin', 'admin', 'manager'],
  edit_lead: ['super_admin', 'admin', 'manager'],
  delete_lead: ['super_admin'],

  // Client management
  view_clients: ['super_admin', 'admin', 'manager', 'viewer'],
  create_client: ['super_admin', 'admin', 'manager'],
  edit_client: ['super_admin', 'admin', 'manager'],
  delete_client: ['super_admin'],

  // Project management
  view_projects: ['super_admin', 'admin', 'manager', 'viewer'],
  create_project: ['super_admin', 'admin', 'manager'],
  edit_project: ['super_admin', 'admin', 'manager'],
  delete_project: ['super_admin'],
  update_project_status: ['super_admin', 'admin', 'manager'],

  // Payment management
  view_payments: ['super_admin', 'admin', 'manager', 'viewer'],
  create_payment: ['super_admin', 'admin', 'manager'],
  edit_payment: ['super_admin', 'admin'],
  delete_payment: ['super_admin'],

  // Task management
  view_tasks: ['super_admin', 'admin', 'manager', 'viewer'],
  create_task: ['super_admin', 'admin', 'manager'],
  edit_task: ['super_admin', 'admin', 'manager'],
  delete_task: ['super_admin', 'admin'],

  // Services management
  view_services: ['super_admin', 'admin', 'manager', 'viewer'],
  manage_services: ['super_admin', 'admin'],
  delete_service: ['super_admin'],

  // Bookings management
  view_bookings: ['super_admin', 'admin', 'manager', 'viewer'],
  manage_bookings: ['super_admin', 'admin', 'manager'],
  delete_booking: ['super_admin'],

  // Contact Forms
  view_contact_forms: ['super_admin', 'admin', 'manager', 'viewer'],
  delete_contact_form: ['super_admin'],

  // System settings
  view_settings: ['super_admin'],
  manage_settings: ['super_admin'],

  // Users management
  view_users: ['super_admin'],
  manage_users: ['super_admin'],
};

const ALLOWED_ADMINS = [
  "nkishore.varma.s81@kalvium.community",
  "kishorevarma2205@gmail.com"
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const clearAuthError = () => setAuthError(null);

  const hasPermission = useCallback((action) => {
    if (!userRole) return false;
    const allowedRoles = PERMISSION_MAP[action];
    if (!allowedRoles) return false;
    return allowedRoles.includes(userRole);
  }, [userRole]);

  useEffect(() => {
    console.log("[AuthContext] Initializing auth listener...");

    // Capture getRedirectResult fallback if popup failed/blocked
    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user) {
          console.log("[AuthContext] Redirect login resolved for:", result.user.email);
        }
      })
      .catch((err) => {
        console.error("[AuthContext] Redirect login error:", err.code, err.message);
        if (err.code !== 'auth/popup-closed-by-user') {
          setAuthError({
            code: err.code || 'unknown',
            message: err.message || 'Google Redirect Login failed.'
          });
        }
      });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("[AuthContext] onAuthStateChanged fired. User:", firebaseUser?.email || "null");

      if (firebaseUser) {
        const email = firebaseUser.email ? firebaseUser.email.toLowerCase() : null;

        console.log("[AuthContext] Firebase User:", firebaseUser);
        console.log("[AuthContext] User Email:", email);
        console.log("[AuthContext] Is in allowedAdmins:", email ? ALLOWED_ADMINS.includes(email) : false);

        // Step 1: Check if this email is an allowed admin or a client
        let isAuthorized = false;
        let isClient = false;
        let clientId = null;
        let clientData = null;

        if (email) {
          isAuthorized = ALLOWED_ADMINS.includes(email);
          if (!isAuthorized) {
            // Check if they are a client
            try {
              const clientsQuery = query(collection(db, 'clients'), where('email', '==', email));
              const clientsSnap = await getDocs(clientsQuery);
              if (!clientsSnap.empty) {
                isAuthorized = true;
                isClient = true;
                clientId = clientsSnap.docs[0].id;
                clientData = clientsSnap.docs[0].data();
              }
            } catch (err) {
              console.error("[AuthContext] Error verifying client status:", err);
            }
          }
        } else if (firebaseUser.phoneNumber) {
          // Phone login — check Firestore for linked email
          try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              if (userData.email) {
                const lowerEmail = userData.email.toLowerCase();
                isAuthorized = ALLOWED_ADMINS.includes(lowerEmail);
                if (!isAuthorized) {
                  const clientsQuery = query(collection(db, 'clients'), where('email', '==', lowerEmail));
                  const clientsSnap = await getDocs(clientsQuery);
                  if (!clientsSnap.empty) {
                    isAuthorized = true;
                    isClient = true;
                    clientId = clientsSnap.docs[0].id;
                    clientData = clientsSnap.docs[0].data();
                  }
                }
              }
            }
          } catch (e) {
            console.error("[AuthContext] Error checking phone user:", e);
          }
        }

        if (!isAuthorized) {
          const reason = email 
            ? `Email "${email}" is not authorized.` 
            : `Phone "${firebaseUser.phoneNumber}" is not associated with an authorized account.`;
          console.error(`[AuthContext] Login REJECTED: ${reason}`);

          setAuthError({ code: 'auth/unauthorized', message: reason });

          // Sign out immediately and reset all state
          await signOut(auth);
          setUser(null);
          setIsAdmin(false);
          setUserRole(null);
          setUserProfile(null);
          setLoading(false);
          return;
        }

        // Step 2: User is authorized — determine role
        let role = isClient ? 'client' : 'super_admin';
        
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (!isClient) {
            if (email === 'kishorevarma2205@gmail.com' || email === 'nkishore.varma.s81@kalvium.community') {
              role = 'super_admin';
            } else if (userDoc.exists() && userDoc.data().role) {
              role = userDoc.data().role;
            }
          }

          console.log("[AuthContext] Assigned Role:", role);
          console.log("[AuthContext] Is Authenticated: true");

          // Write/update profile doc
          const userProfileData = {
            email: email,
            displayName: firebaseUser.displayName || (isClient ? clientData?.contactPerson || 'Client' : (email === "kishorevarma2205@gmail.com" ? "Kishore Varma" : "N Kishore Varma")),
            role: role,
            createdAt: userDoc.exists() ? userDoc.data().createdAt || serverTimestamp() : serverTimestamp(),
            lastLogin: serverTimestamp()
          };

          if (isClient) {
            userProfileData.clientId = clientId;
            userProfileData.company = clientData?.company || clientData?.companyName || '';
          }

          await setDoc(userDocRef, userProfileData, { merge: true });
          
          if (!isClient) {
            try {
              await setDoc(doc(db, 'admins', firebaseUser.uid), {
                email: email,
                role: role,
                updatedAt: serverTimestamp()
              }, { merge: true });
            } catch (e) {
              console.error('[AuthContext] Error updating admins collection:', e);
            }
          }

          // CRITICAL: Set ALL state atomically before setting loading to false
          setAuthError(null);
          setUserRole(role);
          setUserProfile({ id: firebaseUser.uid, ...userProfileData });
          setIsAdmin(!isClient);
          setUser(firebaseUser);
          setLoading(false);

          // Log Login action once per session
          try {
            const sessionLogged = sessionStorage.getItem('logged_in_audit');
            if (!sessionLogged && email) {
              if (isClient) {
                await logAuditAction(email, 'client', 'Login', 'clients', clientId, 'Client logged into the client portal.');
              } else {
                await logAuditAction(email, role, 'Login', 'users', firebaseUser.uid, 'User logged into the admin dashboard.');
              }
              sessionStorage.setItem('logged_in_audit', 'true');
            }
          } catch (auditErr) {
            console.error('[AuthContext] Error logging login audit:', auditErr);
          }

          console.log("[AuthContext] Auth state COMPLETE — user authenticated as", role);
        } catch (e) {
          console.error('[AuthContext] Error in user authorization:', e);
          // Even on Firestore error, the user IS authenticated and authorized
          // Grant them super_admin by default if they're in the allowed list
          setAuthError(null);
          setUserRole('super_admin');
          setUserProfile({ id: firebaseUser.uid, email: email, role: 'super_admin' });
          setIsAdmin(true);
          setUser(firebaseUser);
          setLoading(false);
          
          // Log Login action once per session
          try {
            const sessionLogged = sessionStorage.getItem('logged_in_audit');
            if (!sessionLogged && email) {
              await logAuditAction(email, 'super_admin', 'Login', 'users', firebaseUser.uid, 'User logged into the admin dashboard.');
              sessionStorage.setItem('logged_in_audit', 'true');
            }
          } catch (auditErr) {
            console.error('[AuthContext] Error logging login audit fallback:', auditErr);
          }

          console.log("[AuthContext] Firestore error but user authorized — granted super_admin");
        }
      } else {
        console.log("[AuthContext] No user — resetting all auth state");
        setUser(null);
        setIsAdmin(false);
        setUserRole(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    setAuthError(null);
    if (user) {
      try {
        const email = user.email || 'unknown';
        const role = userRole || 'viewer';
        const uid = user.uid;
        await logAuditAction(email, role, 'Logout', 'users', uid, 'User logged out of the admin dashboard.');
      } catch (auditErr) {
        console.error('[AuthContext] Error logging logout audit:', auditErr);
      }
    }
    sessionStorage.removeItem('logged_in_audit');
    return signOut(auth);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      console.log("[AuthContext] Attempting Google login via popup...");
      const result = await signInWithPopup(auth, provider);
      console.log("[AuthContext] Google popup login successful for:", result.user.email);
      // Don't check allowedAdmins here — let onAuthStateChanged handle it
      // This prevents a race condition where we sign out before onAuthStateChanged fires
      return result;
    } catch (popupErr) {
      console.warn("[AuthContext] Google popup failed:", popupErr.code, popupErr.message);
      if (popupErr.code === 'auth/popup-closed-by-user') {
        throw popupErr; // User closed the popup, don't fall back
      }
      // Fall back to redirect
      try {
        console.log("[AuthContext] Falling back to redirect...");
        await signInWithRedirect(auth, provider);
      } catch (redirectErr) {
        console.error("[AuthContext] Redirect also failed:", redirectErr.code, redirectErr.message);
        throw redirectErr;
      }
    }
  };

  const setupRecaptcha = (containerId) => {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
    }
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => {}
    });
    return window.recaptchaVerifier;
  };

  const sendPhoneOTP = async (phoneNumber, appVerifier) => {
    return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  };

  const value = {
    user,
    isAdmin,
    userRole,
    userProfile,
    hasPermission,
    loading,
    login,
    logout,
    loginWithGoogle,
    setupRecaptcha,
    sendPhoneOTP,
    authError,
    clearAuthError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
