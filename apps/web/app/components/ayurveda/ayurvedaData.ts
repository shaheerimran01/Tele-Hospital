export interface HerbItem {
  name: string;
  image: string;
  description: string;
}

export interface AZDirectoryItem {
  name: string;
  image: string;
  description: string;
}

// 1. Featured Herbs (10 items from Screenshot 1)
export const featuredHerbs: HerbItem[] = [
  {
    name: 'Ashwagandha',
    image:
      'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=400&q=80',
    description:
      'Ashwagandha is an important herb of the Ayurvedic system of medicine. It is also k...',
  },
  {
    name: 'Shilajit',
    image:
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=400&q=80',
    description:
      'Shilajit is a mineral based extract which is pale brown to blackish-brown in color...',
  },
  {
    name: 'Giloy',
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80',
    description:
      'Giloy, also known as Amrita or Guduchi in Hindi, is an herb that helps improve dig...',
  },
  {
    name: 'Amla',
    image:
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80',
    description:
      'Amla, also known as "Indian gooseberry", is loaded with nutrients and is the riche...',
  },
  {
    name: 'Isabgol',
    image:
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80',
    description:
      'Isabgol also known as psyllium husk is a dietary fiber that helps to increase stoo...',
  },
  {
    name: 'Turmeric',
    image:
      'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=400&q=80',
    description:
      'Turmeric is an ancient spice which has been used mainly in cooking. It is also use...',
  },
  {
    name: 'Shatavari',
    image:
      'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=400&q=80',
    description:
      'Shatavari is an Ayurvedic rasayana herb which is also known as the female friendly...',
  },
  {
    name: 'Apple cider vinegar',
    image:
      'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80',
    description:
      'Apple cider vinegar or ACV is a health tonic for strength and power. It is prepara...',
  },
  {
    name: 'Honey',
    image:
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=400&q=80',
    description:
      'Honey is a viscous substance rich in a number of nutrients. In Ayurveda, it is est...',
  },
  {
    name: 'Cinnamon',
    image:
      'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=400&q=80',
    description:
      'Cinnamon, also known as Dalchini, is a spice found in almost every kitchen. Cinna...',
  },
];

// 2. Skin Care Herbs (10 items from Screenshot 1)
export const skinCareHerbs: HerbItem[] = [
  {
    name: 'Aloe vera',
    image:
      'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=400&q=80',
    description:
      'Aloe vera is a cactus-like succulent plant with a clear healing gel in the leaves...',
  },
  {
    name: 'Honey',
    image:
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=400&q=80',
    description:
      'Honey is a viscous substance rich in a number of nutrients. In Ayurveda, it is cal...',
  },
  {
    name: 'Turmeric',
    image:
      'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=400&q=80',
    description:
      'Turmeric is an ancient spice which has been used mainly in cooking. It is also use...',
  },
  {
    name: 'Coconut',
    image:
      'https://images.unsplash.com/photo-1544376798-89aa6b82c6cd?auto=format&fit=crop&w=400&q=80',
    description:
      'Coconut is commonly known as "Nariyal" and is considered as a good luck charm for...',
  },
  {
    name: 'Grapes',
    image:
      'https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=400&q=80',
    description:
      'Grapes also known as Draksha in Ayurveda, is a famous fruit that offers a variety...',
  },
  {
    name: 'Tulsi',
    image:
      'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=400&q=80',
    description:
      'Tulsi is a holy plant that has both medicinal and spiritual properties in Ayurved...',
  },
  {
    name: 'Papaya',
    image:
      'https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?auto=format&fit=crop&w=400&q=80',
    description:
      'Papaya, known as "Erandakarkati" in Ayurveda, is a low calorie juicy fruit rich in...',
  },
  {
    name: 'Olive oil',
    image:
      'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80',
    description:
      'Olive oil, also known as "Jaitoon ka tel" is a pale yellow to dark green oil. It i...',
  },
  {
    name: 'Tea tree oil',
    image:
      'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=400&q=80',
    description:
      'Tea Tree oil is an essential oil with potent antiseptic property. It is beneficia...',
  },
  {
    name: 'Sandalwood',
    image:
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=400&q=80',
    description:
      'Sandalwood or Chandan has cooling and anti-inflammatory properties for natural glow...',
  },
];

// 3. Digestive Care Herbs (10 items from Screenshot 1)
export const digestiveHerbs: HerbItem[] = [
  {
    name: 'Alsi',
    image:
      'https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?auto=format&fit=crop&w=400&q=80',
    description:
      'Alsi or Flax seeds are important oil seeds which are used for various medicinal be...',
  },
  {
    name: 'Ginger',
    image:
      'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=400&q=80',
    description:
      'Ginger is used as a spice, flavoring agent as well as herbal remedy in almost ever...',
  },
  {
    name: 'Dhania',
    image:
      'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=400&q=80',
    description:
      'Dhania or Coriander is an evergreen herb with a characteristic aroma. Dried seeds...',
  },
  {
    name: 'Fennel Seeds',
    image:
      'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=400&q=80',
    description:
      'Fennel seeds are popularly known as "Saunf" in Hindi. It is an ancient Indian spice...',
  },
  {
    name: 'Bael',
    image:
      'https://images.unsplash.com/photo-1579613832125-5d34a13ffe0a?auto=format&fit=crop&w=400&q=80',
    description:
      'Bael or "Shivadurma" also known as the tree of Lord Shiva is of sacred value in In...',
  },
  {
    name: 'Aloe vera',
    image:
      'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=400&q=80',
    description:
      'Aloe vera is a cactus-like succulent plant with a clear healing gel in the leaves...',
  },
  {
    name: 'Licorice',
    image:
      'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=400&q=80',
    description:
      'Licorice or Mulethi, also known as "Sweetwood", is an effective and potent medicin...',
  },
  {
    name: 'Amla',
    image:
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80',
    description:
      'Amla, also known as "Indian gooseberry", is loaded with nutrients and is the riche...',
  },
  {
    name: 'Ajwain',
    image:
      'https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?auto=format&fit=crop&w=400&q=80',
    description:
      'Ajwain is an Indian spice commonly used as a remedy for gastrointestinal problems...',
  },
  {
    name: 'Pudina',
    image:
      'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?auto=format&fit=crop&w=400&q=80',
    description:
      'Pudina or Mint is a refreshing digestive carminative herb that eases indigestion and gas...',
  },
];

// 4. Hair Care Herbs (10 items from Screenshot 1)
export const hairCareHerbs: HerbItem[] = [
  {
    name: 'Onion',
    image:
      'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=400&q=80',
    description:
      'Onion or Pyaaz has a strong pungent sulfur compound that stimulates hair follicles...',
  },
  {
    name: 'Bhringraj',
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80',
    description:
      'Bhringraj is also known as Keshraj, the ruler of hair. It improves blood circulation...',
  },
  {
    name: 'Amla',
    image:
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80',
    description:
      'Amla, also known as "Indian gooseberry", strengthens hair roots and prevents premature graying...',
  },
  {
    name: 'Shikakai',
    image:
      'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=400&q=80',
    description:
      'Shikakai which means "fruit for hair" cleanses scalp without stripping natural oils...',
  },
  {
    name: 'Mehendi',
    image:
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80',
    description:
      'Mehendi or Henna is the symbol of natural hair conditioning and cooling for scalp...',
  },
  {
    name: 'Tea tree oil',
    image:
      'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=400&q=80',
    description:
      'Tea Tree oil is an essential oil with antimicrobial properties to combat dandruff...',
  },
  {
    name: 'Lemongrass',
    image:
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80',
    description:
      'Lemongrass is also known as Bhustrina, imparting freshness and strengthening roots...',
  },
  {
    name: 'Reetha',
    image:
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=400&q=80',
    description:
      'Reetha or Soapnuts is also called as natural shampoo for glossy lustrous hair...',
  },
  {
    name: 'Almond',
    image:
      'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=400&q=80',
    description:
      'Almond, also known as the "King of Nuts", is a highly nutritious food and oil source...',
  },
  {
    name: 'Neem',
    image:
      'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=400&q=80',
    description:
      'Neem has powerful antibacterial and antifungal qualities for healthy, itch-free scalp...',
  },
];

// 5. A to Z Herb Directory (from Screenshot 2)
export const azHerbDirectory: Record<string, AZDirectoryItem[]> = {
  A: [
    {
      name: 'Abhayarishta',
      image:
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=150&q=80',
      description:
        'Abhayarishta, also known as Abhayarishtam, is an Ayurvedic concoction used to tr...',
    },
    {
      name: 'Abhrak',
      image:
        'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=150&q=80',
      description:
        'Abhrak is a mineral compound which consists of silicon, magnesium, calcium, pota...',
    },
    {
      name: 'Achyranthes aspera',
      image:
        'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=150&q=80',
      description:
        'Achyranthes aspera plant and seeds are rich in carbohydrates, proteins and certa...',
    },
    {
      name: 'Adusa',
      image:
        'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=150&q=80',
      description:
        'Adusa, commonly called as Vasa in Ayurveda, is a popular medicinal plant. All p...',
    },
    {
      name: 'Agaru',
      image:
        'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=150&q=80',
      description:
        'Agaru is an evergreen plant which is also known as "Oud" and commonly as Aloe wo...',
    },
    {
      name: 'Agnivardhaka Taila',
      image:
        'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=150&q=80',
      description:
        'Agnivardhaka Taila is a classical Ayurvedic drink made from buttermilk blended w...',
    },
    {
      name: 'Ajmodadi Hima',
      image:
        'https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?auto=format&fit=crop&w=150&q=80',
      description:
        'Ajmodadi Hima is a traditional Ayurvedic herbal drink described in the classical...',
    },
    {
      name: 'Ajwain',
      image:
        'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=150&q=80',
      description:
        'Ajwain is an Indian spice commonly used as a remedy for gastrointestinal problem...',
    },
    {
      name: 'Akarkara',
      image:
        'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=150&q=80',
      description:
        'Akarkara or Akallaka is a perennial herb that grows in the Himalayan region. The...',
    },
    {
      name: 'Almond',
      image:
        'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=150&q=80',
      description:
        'Almond, also known as the "King of Nuts", is a highly nutritious food and is ava...',
    },
    {
      name: 'Aloe vera',
      image:
        'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=150&q=80',
      description:
        'Aloe vera is a cactus-like succulent plant with a clear healing gel in the leave...',
    },
    {
      name: 'Alsi',
      image:
        'https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?auto=format&fit=crop&w=150&q=80',
      description:
        'Alsi or Flax seeds are important oil seeds which are used for various medicinal...',
    },
    {
      name: 'Alum',
      image:
        'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=150&q=80',
      description:
        'Alum or Phitkari, is a transparent salt-like substance that is used in cooking a...',
    },
    {
      name: 'Amalaki Murabba',
      image:
        'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=150&q=80',
      description:
        'Amalaki Murabba is a traditional Ayurvedic preparation made by preserving fresh...',
    },
    {
      name: 'Amalbedha',
      image:
        'https://images.unsplash.com/photo-1579613832125-5d34a13ffe0a?auto=format&fit=crop&w=150&q=80',
      description:
        'Amalbedha or Amlavetasa is an evergreen tree that is native to parts of Myanmar...',
    },
    {
      name: 'Amaltas',
      image:
        'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=150&q=80',
      description:
        'Amaltas also known as Rajvriksha in Ayurveda has bright yellow flowers. It is co...',
    },
    {
      name: 'Amla',
      image:
        'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=150&q=80',
      description:
        'Amla, also known as "Indian gooseberry", is loaded with nutrients and is the ric...',
    },
    {
      name: 'Amritarishta',
      image:
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=150&q=80',
      description:
        'Amritarishta, also known as Amrutharishtam or Amritarishtam, is a polyherbal Ayu...',
    },
    {
      name: 'Ananas',
      image:
        'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=150&q=80',
      description:
        'Ananas or the famous Pineapple is also known as the "King of Fruits". The fruit...',
    },
    {
      name: 'Anantamul',
      image:
        'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=150&q=80',
      description:
        'Anantamul, meaning "Eternal Root" in Sanskrit, is generally found near seashores...',
    },
    {
      name: 'Anjeer',
      image:
        'https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=150&q=80',
      description:
        'Anjeer is a fruit that grows on the Ficus tree. These trees are deciduous and ou...',
    },
    {
      name: 'Apple',
      image:
        'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=150&q=80',
      description:
        'Apple is a sweet and crunchy fruit that varies from green to red in color. It i...',
    },
    {
      name: 'Apple cider vinegar',
      image:
        'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=150&q=80',
      description:
        'Apple cider vinegar or ACV is a health tonic for strength and power. It is prepa...',
    },
    {
      name: 'Apricot',
      image:
        'https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?auto=format&fit=crop&w=150&q=80',
      description:
        'Apricot is a yellowish-orange fleshy fruit with a slight tinge of red on one sid...',
    },
    {
      name: 'Arjuna',
      image:
        'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=150&q=80',
      description:
        'Arjuna also known as the "Arjun tree" is a widely grown tree in India. It has va...',
    },
    {
      name: 'Arjunarishta',
      image:
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=150&q=80',
      description:
        'Arjunarishta, also known as Parthadyarishta, is an Ayurvedic formulation used for...',
    },
    {
      name: 'Arogyavardhini Vati',
      image:
        'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=150&q=80',
      description:
        'Arogyavardhini Vati as suggested by its name "Arogya-good health, Vardhini-impro...',
    },
    {
      name: 'Ashoka',
      image:
        'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=150&q=80',
      description:
        'Ashoka, known as the Ashoka briksh is one of the most ancient and sacred trees f...',
    },
    {
      name: 'Ashokarishta',
      image:
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=150&q=80',
      description:
        'Ashokarishta, also called Asokarstham, is a well-known Ayurvedic preparation. It...',
    },
    {
      name: 'Ashwagandha',
      image:
        'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=150&q=80',
      description:
        'Ashwagandha is an important herb of the Ayurvedic system of medicine. It is also...',
    },
    {
      name: 'Ashwagandharishta',
      image:
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=150&q=80',
      description:
        'Ashwagandharishta, also known as Ashwagandharishtam, is an Ayurvedic classic fo...',
    },
    {
      name: 'Atibala',
      image:
        'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=150&q=80',
      description:
        'Atibala or Indian mallow which means "Very Powerful" is also known as Indian ma...',
    },
    {
      name: 'Atis',
      image:
        'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=150&q=80',
      description:
        'Atis, also known as Ativisha, is a tall herb mainly grown in the Himalayan regio...',
    },
    {
      name: 'Avipattikara Churna',
      image:
        'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=150&q=80',
      description:
        'Avipattikara Churna is one of the most effective Ayurvedic formulations to manag...',
    },
    {
      name: 'Avocado',
      image:
        'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=150&q=80',
      description:
        'Avocado is a green pear-shaped fruit that has high nutritional value. It is a ri...',
    },
  ],
  B: [
    {
      name: 'Babool',
      image:
        'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=150&q=80',
      description:
        'Babool or Acacia arabica is a renowned medicinal tree valued for oral hygiene...',
    },
    {
      name: 'Bael',
      image:
        'https://images.unsplash.com/photo-1579613832125-5d34a13ffe0a?auto=format&fit=crop&w=150&q=80',
      description:
        'Bael fruit is famous for its digestive and bowel regulating properties...',
    },
    {
      name: 'Brahmi',
      image:
        'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=150&q=80',
      description:
        'Brahmi is an exceptional brain tonic that enhances memory, alertness, and clarity...',
    },
    {
      name: 'Bhringraj',
      image:
        'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=150&q=80',
      description:
        'Bhringraj is the sovereign herb for healthy, dark and luscious hair growth...',
    },
  ],
};
