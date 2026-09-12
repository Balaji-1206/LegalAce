import AsyncStorage from '@react-native-async-storage/async-storage';

export type SupportedLang = 'en' | 'hi' | 'ta';

export const LANG_STORAGE_KEY = '@legalace_active_lang';

export interface TranslationDictionary {
  // Navigation & Core
  nav_home: string;
  nav_wizard: string;
  nav_situations: string;
  nav_deadlines: string;
  nav_rights: string;
  nav_xray: string;
  nav_profile: string;
  nav_legalaid: string;

  // Home Screen
  home_badge: string;
  home_title: string;
  home_search_placeholder: string;
  home_quick_actions: string;
  home_action_wizard_title: string;
  home_action_wizard_desc: string;
  home_action_xray_title: string;
  home_action_xray_desc: string;
  home_action_deadlines_title: string;
  home_action_deadlines_desc: string;
  home_action_aid_title: string;
  home_action_aid_desc: string;
  home_recent_title: string;
  home_view_all: string;

  // Daily Rights Screen
  rights_title: string;
  rights_subtitle: string;
  rights_search_placeholder: string;
  rights_listen: string;
  rights_listening: string;
  rights_share: string;
  rights_no_results: string;
  rights_no_results_sub: string;
  rights_clear: string;

  // Chat & Voice
  chat_voice_hint: string;
  chat_listen_response: string;
  chat_stop_listening: string;
}

export const TRANSLATIONS: Record<SupportedLang, TranslationDictionary> = {
  en: {
    nav_home: 'Home',
    nav_wizard: 'Wizard',
    nav_situations: 'Explore',
    nav_deadlines: 'Deadlines',
    nav_rights: 'Rights',
    nav_xray: 'X-Ray',
    nav_profile: 'Profile',
    nav_legalaid: 'Legal Aid',

    home_badge: 'Indian Law Companion',
    home_title: 'LegalAce',
    home_search_placeholder: 'Search Indian laws, rights, or legal issues...',
    home_quick_actions: 'Statutory Action Hub',
    home_action_wizard_title: 'Guided Legal Wizard',
    home_action_wizard_desc: 'Interactive dispute tree & legal notice draft',
    home_action_xray_title: 'Document AI X-Ray',
    home_action_xray_desc: 'Inspect lease, notice, or FIR for red flags',
    home_action_deadlines_title: 'Limitation Monitor',
    home_action_deadlines_desc: 'Track statutory filing limitation periods',
    home_action_aid_title: 'Free Legal Aid (NALSA)',
    home_action_aid_desc: 'Section 12 eligibility & DLSA directory',
    home_recent_title: 'Recent Guides & Frameworks',
    home_view_all: 'View All →',

    rights_title: 'Daily Rights.',
    rights_subtitle: 'Bite-sized statutory knowledge to empower your everyday life under Indian law.',
    rights_search_placeholder: 'Search daily rights & protections...',
    rights_listen: 'Listen Aloud',
    rights_listening: 'Speaking...',
    rights_share: 'Share Right',
    rights_no_results: 'No matching rights found',
    rights_no_results_sub: 'Try searching for terms like "MRP", "salary", "FIR", or "eviction".',
    rights_clear: 'Clear Search',

    chat_voice_hint: 'Tap microphone to speak your question',
    chat_listen_response: 'Listen in English',
    chat_stop_listening: 'Stop Audio',
  },
  hi: {
    nav_home: 'होम',
    nav_wizard: 'सहायक',
    nav_situations: 'विषय',
    nav_deadlines: 'समय-सीमा',
    nav_rights: 'अधिकार',
    nav_xray: 'दस्तावेज़',
    nav_profile: 'प्रोफ़ाइल',
    nav_legalaid: 'मुफ़्त सहायता',

    home_badge: 'भारतीय क़ानूनी साथी',
    home_title: 'लीगलएस',
    home_search_placeholder: 'भारतीय क़ानून, अधिकार या समस्या खोजें...',
    home_quick_actions: 'क़ानूनी सहायता केंद्र',
    home_action_wizard_title: 'क़ानूनी मार्गदर्शन विज़ार्ड',
    home_action_wizard_desc: 'चरण-दर-चरण समाधान और क़ानूनी नोटिस मसौदा',
    home_action_xray_title: 'दस्तावेज़ एआई एक्स-रे',
    home_action_xray_desc: 'किरायानामा, नोटिस या प्राथमिकी की जाँच करें',
    home_action_deadlines_title: 'समय-सीमा मॉनिटर',
    home_action_deadlines_desc: 'क़ानूनी मियाद (लिमिटेशन) की समय-सीमा ट्रैक करें',
    home_action_aid_title: 'मुफ़्त क़ानूनी सहायता',
    home_action_aid_desc: 'धारा 12 पात्रता व ज़िला विधिक सेवा प्राधिकरण',
    home_recent_title: 'हालिया मार्गदर्शिकाएँ',
    home_view_all: 'सभी देखें →',

    rights_title: 'दैनिक क़ानूनी अधिकार।',
    rights_subtitle: 'भारतीय क़ानून के तहत आपके दैनिक जीवन को सशक्त बनाने वाले महत्वपूर्ण अधिकार।',
    rights_search_placeholder: 'अधिकार व सुरक्षा खोजें...',
    rights_listen: 'बोलकर सुनें',
    rights_listening: 'सुनाया जा रहा है...',
    rights_share: 'शेयर करें',
    rights_no_results: 'कोई संबंधित अधिकार नहीं मिला',
    rights_no_results_sub: '"MRP", "वेतन", "FIR" या "किराया" जैसे शब्द खोजें।',
    rights_clear: 'खोज साफ़ करें',

    chat_voice_hint: 'बोलकर सवाल पूछने के लिए माइक दबाएँ',
    chat_listen_response: 'हिंदी में सुनें',
    chat_stop_listening: 'ऑडियो रोकें',
  },
  ta: {
    nav_home: 'முகப்பு',
    nav_wizard: 'வழிகாட்டி',
    nav_situations: 'சட்டங்கள்',
    nav_deadlines: 'காலக்கெடு',
    nav_rights: 'உரிமைகள்',
    nav_xray: 'ஆய்வு',
    nav_profile: 'சுயவிவரம்',
    nav_legalaid: 'இலவச உதவி',

    home_badge: 'இந்திய சட்ட வழிகாட்டி',
    home_title: 'லீகல்ஏஸ்',
    home_search_placeholder: 'சட்டம், உரிமை அல்லது வழக்குகளைத் தேடுங்கள்...',
    home_quick_actions: 'சட்ட நடவடிக்கை மையம்',
    home_action_wizard_title: 'வழிகாட்டப்பட்ட சட்ட வழிகாட்டி',
    home_action_wizard_desc: 'படிபடியான தீர்வு & சட்டப்பூர்வ அறிவிப்பு வரைவு',
    home_action_xray_title: 'ஆவண எக்ஸ்-ரே ஆய்வு',
    home_action_xray_desc: 'ஒப்பந்தம் அல்லது புகாரில் உள்ள தவறுகளைக் கண்டறியவும்',
    home_action_deadlines_title: 'காலக்கெடு கண்காணிப்பாளர்',
    home_action_deadlines_desc: 'சட்டப்பூர்வ காலக்கெடுவை கண்காணிக்கவும்',
    home_action_aid_title: 'இலவச சட்ட உதவி (NALSA)',
    home_action_aid_desc: 'பிரிவு 12 தகுதி & மாவட்ட சட்ட உதவி மையம்',
    home_recent_title: 'சமீபத்திய வழிகாட்டல்கள்',
    home_view_all: 'அனைத்தும் →',

    rights_title: 'அன்றாட சட்ட உரிமைகள்.',
    rights_subtitle: 'இந்திய சட்டத்தின் கீழ் உங்களை வலுப்படுத்தும் நடைமுறை உரிமைகள்.',
    rights_search_placeholder: 'அன்றாட உரிமைகளைத் தேடுங்கள்...',
    rights_listen: 'ஒலியில் கேட்க',
    rights_listening: 'ஒலிக்கிறது...',
    rights_share: 'பகிர்க',
    rights_no_results: 'பொருத்தமான உரிமைகள் இல்லை',
    rights_no_results_sub: '"MRP", "சம்பளம்", "FIR", அல்லது "வாடகை" போன்றவற்றைத் தேடுங்கள்.',
    rights_clear: 'அழிக்க',

    chat_voice_hint: 'பேசி கேள்வி கேட்க மைக்கை அழுத்தவும்',
    chat_listen_response: 'தமிழில் கேட்க',
    chat_stop_listening: 'நிறுத்து',
  },
};

export const t = (key: keyof TranslationDictionary, lang: SupportedLang = 'en'): string => {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  return dict[key] || TRANSLATIONS.en[key] || key;
};

export const getSavedLanguage = async (): Promise<SupportedLang> => {
  try {
    const saved = await AsyncStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'hi' || saved === 'ta' || saved === 'en') {
      return saved;
    }
  } catch { /* fallback */ }
  return 'en';
};

export const saveLanguage = async (lang: SupportedLang): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch { /* ignored */ }
};
