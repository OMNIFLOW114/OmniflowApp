// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector) // auto-detects language
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: {
        translation: {
          settings: 'Settings',
          account: 'Account',
          email: 'Email',
          phone: 'Phone Number',
          language: 'Language',
          preferences: 'Preferences',
          darkMode: 'Dark Mode',
          notifications: 'Push Notifications',
          autoUpdate: 'Auto Updates',
          privacy: 'Private Profile',
          support: 'Support',
          feedback: 'Give Feedback',
          dangerZone: 'Danger Zone',
          deleteAccount: 'Delete Account',
          about: 'About',
          version: 'Version',
        },
      },
      fr: {
        translation: {
          settings: 'Paramètres',
          account: 'Compte',
          email: 'E-mail',
          phone: 'Numéro de téléphone',
          language: 'Langue',
          preferences: 'Préférences',
          darkMode: 'Mode sombre',
          notifications: 'Notifications push',
          autoUpdate: 'Mises à jour automatiques',
          privacy: 'Profil privé',
          support: 'Support',
          feedback: 'Donner un avis',
          dangerZone: 'Zone dangereuse',
          deleteAccount: 'Supprimer le compte',
          about: 'À propos',
          version: 'Version',
        },
      },
      // Add Swahili, Spanish, etc. here
    },
  });

export default i18n;
