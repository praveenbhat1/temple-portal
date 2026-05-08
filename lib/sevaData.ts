export interface SevaItem {
  id: string;
  nameEn: string;
  nameKn: string;
  price: number;
  noteEn?: string;
  noteKn?: string;
}

export interface SevaGroup {
  titleEn: string;
  titleKn: string;
  items: SevaItem[];
}

export const SEVA_DATA: SevaGroup[] = [
  {
    titleEn: "VISHESHA SEVAS",
    titleKn: "ವಿಶೇಷ ಸೇವೆಗಳು",
    items: [
      { id: "vis-1", nameEn: "Vinayaki / Sankashta Chaturthi Ganohoma Prasada", nameKn: "ವಿನಾಯಕಿ ಸಂಕಷ್ಟ ಚತುರ್ಥಿ ಗಣಹೋಮ ಪ್ರಸಾದ", price: 50 },
      { id: "vis-2", nameEn: "Sankashta Chaturthi Pooja (Evening)", nameKn: "ಸಂಕಷ್ಟ ಚತುರ್ಥಿ ಪೂಜೆ (ಸಂಜೆ)", price: 100 },
      { id: "vis-3", nameEn: "Appe / Modaka / Kajjaya Seva", nameKn: "ಅಪ್ಪೆ / ಮೋದಕ / ಕಜ್ಜಾಯ ಸೇವೆ", price: 150, noteEn: "(Only on Sankashtahara Chaturthi and Shuddha Chaturthi / Vinayaki) (Evening)", noteKn: "(ಸಂಕಷ್ಟಹರ ಚತುರ್ಥಿ ಮತ್ತು ಶುದ್ಧ ಚತುರ್ಥಿ / ವಿನಾಯಕಿ ದಿವಸ ಮಾತ್ರ) (ಸಂಜೆ)" },
      { id: "vis-4", nameEn: "Moode Prasada Seva", nameKn: "ಮೂಡೆ ಪ್ರಸಾದ ಸೇವೆ", price: 150 },
      { id: "vis-5", nameEn: "Samuhika Gana Homa", nameKn: "ಸಾಮೂಹಿಕ ಗಣಹೋಮ", price: 500, noteEn: "On Sankashta Chaturthi (Morning)", noteKn: "ಸಂಕಷ್ಟ ಚತುರ್ಥಿಯಂದು (ಬೆಳಿಗ್ಗೆ)" },
      { id: "vis-6", nameEn: "Moode Naivedya Seva", nameKn: "ಮೂಡೆ ನೈವೇದ್ಯ ಸೇವೆ", price: 500, noteEn: "Only on Afternoon", noteKn: "ಮಧ್ಯಾಹ್ನ ಮಾತ್ರ" },
      { id: "vis-7", nameEn: "Ganahoma (2 Coconuts)", nameKn: "ಗಣಹೋಮ (2 ತೆಂಗಿನಕಾಯಿ)", price: 2000 },
      { id: "vis-8", nameEn: "Sathya Ganapathi Vrata", nameKn: "ಸತ್ಯ ಗಣಪತಿ ವ್ರತ", price: 2000 },
      { id: "vis-9", nameEn: "Ranga Pooja", nameKn: "ರಂಗಪೂಜೆ", price: 2000 },
      { id: "vis-10", nameEn: "Moodu Ganapathi Seva (21 coconuts)", nameKn: "ಮೂಡು ಗಣಪತಿ ಸೇವೆ (21 ತೆಂಗಿನಕಾಯಿ)", price: 2500 },
    ]
  },
  {
    titleEn: "REGULAR SEVAS",
    titleKn: "ಸಾಮಾನ್ಯ ಸೇವೆಗಳು",
    items: [
      { id: "reg-1", nameEn: "Mangalarathi", nameKn: "ಮಂಗಳಾರತಿ", price: 10 },
      { id: "reg-2", nameEn: "Panchakajjaya", nameKn: "ಪಂಚಕಜ್ಜಾಯ", price: 10 },
      { id: "reg-3", nameEn: "Dwadasha Doorvarchaney", nameKn: "ದ್ವಾದಶ ದೂರ್ವಾಚನೆ", price: 40 },
      { id: "reg-4", nameEn: "Ashtottara Shatanamavali", nameKn: "ಅಷ್ಟೋತ್ತರ ಶತನಾಮಾವಳಿ", price: 50, noteEn: "(Flower and Garike Pooja)", noteKn: "(ಹೂಗಳ ಮತ್ತು ಗರಿಕೆ ಪೂಜೆ)" },
      { id: "reg-5", nameEn: "Chandanabhisheka", nameKn: "ಚಂದನಾಭಿಷೇಕ", price: 80 },
      { id: "reg-6", nameEn: "Panchamruta Abhisheka", nameKn: "ಪಂಚಾಮೃತ ಅಭಿಷೇಕ", price: 100 },
      { id: "reg-7", nameEn: "Sahasranama Archane", nameKn: "ಸಹಸ್ರನಾಮ ಅರ್ಚನೆ", price: 150 },
      { id: "reg-8", nameEn: "Maha Pooja", nameKn: "ಮಹಾಪೂಜೆ", price: 300 },
      { id: "reg-9", nameEn: "Trikala Pooja", nameKn: "ತ್ರಿಕಾಲ ಪೂಜೆ", price: 1000, noteEn: "(All the Poojas in a single day, Coconuts and Fruits as Prasadam)", noteKn: "(ಒಂದೇ ದಿನದಲ್ಲಿ ಮೂರು ಪೂಜೆಗಳು, ತೆಂಗಿನಕಾಯಿ ಮತ್ತು ಹಣ್ಣು ಪ್ರಸಾದ)" },
    ]
  },
  {
    titleEn: "SEVAS AT GURU PADUKA SANNIDHI",
    titleKn: "ಗುರುಪಾದುಕಾ ಸನ್ನಿಧಿ ಸೇವೆಗಳು",
    items: [
      { id: "guru-1", nameEn: "Aajya Seva (21 days)", nameKn: "ಆಜ್ಯ ಸೇವೆ (21 ದಿನ)", price: 100, noteEn: "Ghee lamp to be lighted in sannidhi for 21 evenings", noteKn: "ಸನ್ನಿಧಿಯಲ್ಲಿ 21 ಸಂಜೆಗಳ ಕಾಲ ತುಪ್ಪದ ದೀಪ ಹಚ್ಚುವುದು" },
    ]
  },
  {
    titleEn: "LIFE TIME EVENTS SEVAS",
    titleKn: "ಲೈಫ್ ಟೈಮ್ ಇವೆಂಟ್ಸ್ ಸೇವೆಗಳು",
    items: [
      { id: "life-1", nameEn: "Anna Prashana", nameKn: "ಅನ್ನ ಪ್ರಾಶನ", price: 1100, noteEn: "(Includes Trikala Pooja and Rice Kheer)", noteKn: "(ತ್ರಿಕಾಲ ಪೂಜೆ ಮತ್ತು ಪಾಯಸ ಒಳಗೊಂಡಿದೆ)" },
      { id: "life-2", nameEn: "Aksharabhyasa", nameKn: "ಅಕ್ಷರಭ್ಯಾಸ", price: 1100, noteEn: "(Includes Trikala Pooja)", noteKn: "(ತ್ರಿಕಾಲ ಪೂಜೆ ಒಳಗೊಂಡಿದೆ)" },
      { id: "life-3", nameEn: "Vahana Pooja", nameKn: "ವಾಹನ ಪೂಜೆ", price: 150 },
      { id: "life-4", nameEn: "Tula Bhara", nameKn: "ತುಲಾ ಭಾರ", price: 1000, noteEn: "(The dravya Dhanya / Coconut / Bananas / Flower Offerings)", noteKn: "(ಧಾನ್ಯ / ತೆಂಗಿನಕಾಯಿ / ಬಾಳೆಹಣ್ಣು / ಹೂವಿನ ಕಾಣಿಕೆ)" },
    ]
  }
];

export const ALL_SEVAS = SEVA_DATA.flatMap(g => g.items);
