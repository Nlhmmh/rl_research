import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const translations = {
  en: {
    translation: {
      gameTitle: "Zawgyi: Quest for the Philosopher's Stone",
      watch: {
        goalReached: 'Goal reached! AI found the Philosopher’s Stone.',
        savedPolicy: 'Saved policy',
        choosePolicy: 'Choose a run and agent',
        noPolicies: 'No saved policies',
        incompatiblePolicy: 'Incompatible version',
        loadSelected: 'Load selected policy',
        goalNotReached: 'Goal not reached. AI fell into a gap or ran out of time.',
        restartHint: 'Episode finished. Press Restart to watch another attempt.',
      },
      subtitle: 'A journey through Himavanta Forest',
      menu: {
        play: 'Play Game',
        watch: 'Watch AI',
        train: 'Train AI',
      },
      common: {
        back: 'Back to Menu',
        pause: 'Pause',
        resume: 'Resume',
        restart: 'Restart',
        save: 'Save',
        load: 'Load',
        start: 'Start',
        stop: 'Stop',
        reset: 'Reset',
      },
      game: {
        success: "You found the Philosopher's Stone!",
        failed: 'You fell into a gap. Try again.',
        progress: 'Level progress',
        controls: 'Arrow keys or A/D to move; Space to jump',
      },
      training: {
        algorithm: 'Algorithm',
        visualization: 'Game visualization',
        renderOn: 'Render agents',
        renderOff: 'Headless training',
        renderDisabled:
          'Rendering is off. Training and charts continue. Use Max speed for fastest training.',
        agents: 'Number of agents',
        stepBudget: 'Training steps per agent',
        extend: 'Extend step budget',
        speed: 'Training speed',
        camera: 'Camera',
        overview: 'Overview',
        follow: 'Follow agent',
        watchTrained: 'Watch trained AI',
        episode: 'Episode',
        reward: 'Reward',
        averageReward: 'Average reward',
        successRate: 'Success rate',
        successes: 'Successes',
        failures: 'Failures',
        epsilon: 'Exploration (epsilon)',
        status: 'Status',
        currentAction: 'Current action',
      },
    },
  },
  my: {
    translation: {
      gameTitle: 'ဇော်ဂျီနှင့် ဓာတ်လုံးရှာဖွေခန်း',
      watch: {
        goalReached: 'ပန်းတိုင်ရောက်ပါပြီ။ AI က ဓာတ်လုံးကို ရှာတွေ့ပါပြီ။',
        savedPolicy: 'သိမ်းထားသော မူဝါဒ',
        choosePolicy: 'လေ့ကျင့်မှုနှင့် AI ကို ရွေးပါ',
        noPolicies: 'သိမ်းထားသော မူဝါဒ မရှိပါ',
        incompatiblePolicy: 'ဗားရှင်း မကိုက်ညီပါ',
        loadSelected: 'ရွေးထားသော မူဝါဒကို ဖွင့်ရန်',
        goalNotReached: 'ပန်းတိုင်မရောက်ပါ။ AI သည် ချောက်ထဲကျသွားသည် သို့မဟုတ် အချိန်ကုန်သွားသည်။',
        restartHint: 'ဤအကြိမ်ပြီးဆုံးပါပြီ။ နောက်တစ်ကြိမ်ကြည့်ရန် ပြန်စရန် ခလုတ်ကို နှိပ်ပါ။',
      },
      subtitle: 'ဟိမဝန္တာတောအတွင်း စွန့်စားခန်း',
      menu: {
        play: 'ဂိမ်းကစားရန်',
        watch: 'AI ကစားတာကြည့်ရန်',
        train: 'AI လေ့ကျင့်ရန်',
      },
      common: {
        back: 'ပင်မစာမျက်နှာသို့',
        pause: 'ခေတ္တရပ်ရန်',
        resume: 'ဆက်လက်ရန်',
        restart: 'ပြန်စရန်',
        save: 'သိမ်းရန်',
        load: 'ပြန်ဖွင့်ရန်',
        start: 'စတင်ရန်',
        stop: 'ရပ်ရန်',
        reset: 'အစမှပြန်စရန်',
      },
      game: {
        success: 'ဓာတ်လုံးကို ရှာတွေ့ပါပြီ။',
        failed: 'ချောက်ထဲကျသွားပါပြီ။ ထပ်ကြိုးစားပါ။',
        progress: 'ဂိမ်းအဆင့် တိုးတက်မှု',
        controls: 'ဘယ်/ညာ ခလုတ် သို့မဟုတ် A/D ဖြင့်ရွှေ့ပါ။ Space ဖြင့်ခုန်ပါ။',
      },
      training: {
        algorithm: 'အယ်လ်ဂိုရစ်သမ်',
        visualization: 'ဂိမ်းမြင်ကွင်း',
        renderOn: 'AI များကို ပြရန်',
        renderOff: 'မြင်ကွင်းမပါဘဲ လေ့ကျင့်ရန်',
        renderDisabled:
          'မြင်ကွင်းကို ပိတ်ထားပါသည်။ လေ့ကျင့်မှုနှင့် ဂရပ်များ ဆက်လက်လုပ်ဆောင်နေပါသည်။ အမြန်ဆုံးလေ့ကျင့်ရန် Max ကို ရွေးပါ။',
        agents: 'AI အရေအတွက်',
        stepBudget: 'AI တစ်ခုချင်းစီအတွက် လေ့ကျင့်မှုခြေလှမ်း',
        extend: 'လေ့ကျင့်မှုခြေလှမ်း တိုးရန်',
        speed: 'လေ့ကျင့်မှုအမြန်နှုန်း',
        camera: 'ကင်မရာ',
        overview: 'မြင်ကွင်းအပြည့်',
        follow: 'AI နောက်လိုက်ကြည့်ရန်',
        watchTrained: 'လေ့ကျင့်ပြီးသော AI ကိုကြည့်ရန်',
        episode: 'အကြိမ်',
        reward: 'ဆုမှတ်',
        averageReward: 'ပျမ်းမျှဆုမှတ်',
        successRate: 'အောင်မြင်မှုရာခိုင်နှုန်း',
        successes: 'အောင်မြင်မှုများ',
        failures: 'မအောင်မြင်မှုများ',
        epsilon: 'စူးစမ်းမှု (epsilon)',
        status: 'အခြေအနေ',
        currentAction: 'လက်ရှိလုပ်ဆောင်ချက်',
      },
    },
  },
} as const;

const savedLanguage = localStorage.getItem('zawgyi-language');
const initialLanguage = savedLanguage === 'my' ? 'my' : 'en';

void i18n.use(initReactI18next).init({
  resources: translations,
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

document.documentElement.lang = initialLanguage;
export default i18n;
