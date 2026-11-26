// Demo data for local development: `npm run db:seed` (wipes existing data).
// All names, companies and messages below are fictional.
import { PrismaClient, type Product, type ProductColor, type Store, type User } from "@prisma/client";
import { artUrl } from "../src/lib/art";
import { hashPassword } from "../src/lib/password";
import { parseSizes, parseTiers, round2, unitPrice } from "../src/lib/pricing";
import { randomCode, slugify } from "../src/lib/utils";

const prisma = new PrismaClient();

/** Password of every demo account (local development only). Also listed in README.md. */
// Password for every demo account, read from .env (never committed).
try {
  process.loadEnvFile();
} catch {
  // No .env file (e.g. on Vercel): the variables come from the environment.
}
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "";
if (DEMO_PASSWORD.length < 8) {
  throw new Error("Set DEMO_PASSWORD (8+ characters) in .env, or in Vercel's environment variables, before seeding.");
}

// Deterministic pseudo-random numbers, so every reset produces the same catalog.
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261122);
const between = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const NOW = Date.now();
const hoursAgo = (hours: number) => new Date(NOW - hours * 3_600_000);
const daysAgo = (days: number) => hoursAgo(days * 24);

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

const COLORS = {
  white: ["Off White", "#F4EFE6"],
  blush: ["Blush Pink", "#F7A8C4"],
  rose: ["Rose", "#E86A92"],
  coral: ["Coral", "#FF7F66"],
  red: ["Cherry Red", "#D9434E"],
  yellow: ["Sunshine Yellow", "#FFD166"],
  mustard: ["Mustard", "#E0A526"],
  mint: ["Mint", "#8FD9C3"],
  sage: ["Sage Green", "#9DBF9E"],
  olive: ["Olive", "#7A8450"],
  sky: ["Sky Blue", "#8EC5FF"],
  blue: ["Ocean Blue", "#3D7DD8"],
  navy: ["Navy", "#2E3A66"],
  lilac: ["Lilac", "#C3B5F5"],
  beige: ["Sand Beige", "#E3CDB0"],
  camel: ["Camel", "#C49A6C"],
  grey: ["Heather Grey", "#B8BCC6"],
  denim: ["Denim Blue", "#5B7DB1"],
  khaki: ["Khaki", "#C2B280"],
  charcoal: ["Charcoal", "#4A4E5A"],
  peach: ["Peach", "#FFC2A6"],
  green: ["Leaf Green", "#6DBE7B"],
  teal: ["Teal", "#2A8C8C"],
  cream: ["Cream", "#F3EBDD"],
  burgundy: ["Burgundy Check", "#8C2F2F"],
  royal: ["Royal Blue", "#2340B0"],
  rust: ["Rust", "#B4482E"],
  berry: ["Berry", "#A8234F"],
  forest: ["Forest Teal", "#1F5F5C"],
  indigo: ["Dark Denim", "#2D3E66"],
} as const;
type ColorKey = keyof typeof COLORS;

const SIZES = {
  BABY: ["3-6M", "6-9M", "9-12M", "12-18M"],
  KIDS: ["2Y", "3Y", "4Y", "5Y"],
  KIDS_B: ["3Y", "4Y", "5Y", "6Y"],
  KIDS_C: ["4Y", "5Y", "6Y", "7Y", "8Y"],
  JUNIOR: ["8Y", "10Y", "12Y", "14Y"],
  SHOES_BABY: ["EU 17", "EU 18", "EU 19", "EU 20"],
  SHOES_KIDS: ["EU 24", "EU 25", "EU 26", "EU 27", "EU 28"],
  ONE_SIZE: ["One size"],
} as const;

const CATEGORIES = [
  { slug: "dresses", name: "Dresses & Skirts", art: "dress", color: "#F7A8C4" },
  { slug: "sets", name: "Sets & Outfits", art: "set", color: "#FFD166" },
  { slug: "tops", name: "T-shirts & Tops", art: "tshirt", color: "#8EC5FF" },
  { slug: "bottoms", name: "Pants & Shorts", art: "pants", color: "#5B7DB1" },
  { slug: "hoodies", name: "Hoodies & Tracksuits", art: "hoodie", color: "#9DBF9E" },
  { slug: "outerwear", name: "Jackets & Outerwear", art: "jacket", color: "#FF7F66" },
  { slug: "sleepwear", name: "Pajamas & Sleepwear", art: "pajama", color: "#C3B5F5" },
  { slug: "baby", name: "Baby Rompers & Bodysuits", art: "romper", color: "#8FD9C3" },
  { slug: "shoes", name: "Shoes", art: "shoes", color: "#F7A8C4" },
  { slug: "accessories", name: "Accessories", art: "bow", color: "#F49AB0" },
];

// Arabic names for categories and products (stored in nameTranslations).
const CATEGORY_AR: Record<string, string> = {
  dresses: "الفساتين والتنانير",
  sets: "الأطقم",
  tops: "التيشيرتات والبلوزات",
  bottoms: "البناطيل والشورتات",
  hoodies: "الهوديز والأطقم الرياضية",
  outerwear: "الجاكيتات والمعاطف",
  sleepwear: "البيجامات وملابس النوم",
  baby: "أفرولات وبوديهات الرضّع",
  shoes: "الأحذية",
  accessories: "الإكسسوارات",
};

const PRODUCT_AR: Record<string, string> = {
  "Organic Cotton Short Sleeve Bodysuit": "بودي قطن عضوي بأكمام قصيرة",
  "Ribbed Long Sleeve Romper": "أفرول مضلّع بأكمام طويلة",
  "Star Print Baby Pajama Set": "بيجاما رضّع بنقشة نجوم",
  "Teddy Fleece Baby Jacket": "جاكيت فرو تيدي للرضّع",
  "Muslin Summer Romper": "أفرول صيفي من الموسلين",
  "Cotton Baby Jogger Pants": "بنطلون رياضي قطني للرضّع",
  "Heart Print Bodysuit": "بودي بنقشة قلوب",
  "Tulle Party Dress": "فستان سهرة من التول",
  "Polka Dot Summer Dress": "فستان صيفي منقّط",
  "Pleated Tutu Skirt": "تنورة توتو بكسرات",
  "Ruffle Top & Shorts Set": "طقم بلوزة بكشكش وشورت",
  "Gingham Pinafore Dress": "فستان مريول كاروهات",
  "Velvet Holiday Dress": "فستان مخمل للمناسبات",
  "Rainbow Graphic Tee": "تيشيرت بطبعة قوس قزح",
  "Basic Crew Neck Tee": "تيشيرت أساسي بياقة دائرية",
  "Striped Long Sleeve Top": "بلوزة مقلّمة بأكمام طويلة",
  "Star Tee & Shorts Set": "طقم تيشيرت نجمة وشورت",
  "Cotton Bermuda Shorts": "شورت برمودا قطني",
  "Denim Jogger Pants": "بنطلون جينز رياضي",
  "Pique Polo Shirt": "قميص بولو بيكيه",
  "Quilted Puffer Jacket": "جاكيت منفوخ مبطّن",
  "Hooded Windbreaker": "جاكيت واقٍ من الريح بقبعة",
  "Kangaroo Pocket Hoodie": "هودي بجيب كنغر",
  "Zip Tracksuit Set": "طقم رياضي بسحّاب",
  "Smiley Fleece Hoodie": "هودي فليس بوجه مبتسم",
  "Teen Bomber Jacket": "جاكيت بومبر للمراهقين",
  "Cotton Pajama Set": "طقم بيجاما قطني",
  "Moon & Stars Pajamas": "بيجاما القمر والنجوم",
  "Essential Cotton Tee": "تيشيرت قطني أساسي",
  "Cotton Leggings": "ليغنز قطني",
  "Long Sleeve Sleep Romper": "أفرول نوم بأكمام طويلة",
  "Jersey Shorts": "شورت جيرسي",
  "Egyptian Cotton Pajama Set": "طقم بيجاما من القطن المصري",
  "Linen Shirt & Shorts Set": "طقم قميص وشورت كتان",
  "Heart Print Tee": "تيشيرت بطبعة قلب",
  "Cotton Summer Dress": "فستان صيفي قطني",
  "Striped Sleep Set": "طقم نوم مقلّم",
  "Ceremony Tulle Dress": "فستان تول للمناسبات الرسمية",
  "Double-Breasted Wool Coat": "معطف صوف بصفّين من الأزرار",
  "Pleated Midi Skirt": "تنورة ميدي بكسرات",
  "Linen Trousers": "بنطلون كتان",
  "Cashmere-Touch Hoodie": "هودي بملمس الكشمير",
  "Eid Party Dress": "فستان العيد",
  "Boys Shirt & Shorts Set": "طقم قميص وشورت للأولاد",
  "Heart Pattern Pajama Set": "طقم بيجاما بنقشة قلوب",
  "Smiley Jersey Tee": "تيشيرت جيرسي بوجه مبتسم",
  "Cargo Shorts": "شورت كارغو",
  "Light Puffer Vest": "صدرية منفوخة خفيفة",
  "Soft Sole Baby Shoes": "حذاء رضّع بنعل طري",
  "Canvas Sneakers": "حذاء رياضي من الكانفاس",
  "Glitter Ballet Flats": "حذاء باليه لامع",
  "Winter Ankle Boots": "جزمة شتوية قصيرة",
  "Satin Hair Bow Clips": "مشابك شعر بفيونكة ساتان",
  "Velvet Bow Headband": "طوق شعر بفيونكة مخمل",
  "Polka Dot Hair Bows": "فيونكات شعر منقّطة",
  "Striped Peach Bodysuit": "بودي مقلّم بلون الخوخ",
  "Leather Mary Jane First Shoes": "حذاء ماري جين للخطوات الأولى",
  "Moon & Stars Pajama Set": "طقم بيجاما الهلال والنجوم",
  "Sherpa Fleece Vest": "صدرية فرو شيربا",
  "Lilac Tulle Flower Dress": "فستان تول ليلكي بالورود",
  "Strawberry Collar Blouse": "بلوزة بياقة مطرزة بالفراولة",
  "Pleated Twill Skirt": "تنورة تويل بكسرات",
  "Gingham Pocket Sundress": "فستان صيفي كاروهات بجيوب",
  "Grosgrain Hair Bow": "فيونكة شعر غروغرين",
  "Wide-Leg Denim Jeans": "جينز واسع الساق",
  "Hot Air Balloon Sweatshirt": "سويت شيرت بتطريز منطاد",
  "Striped Rugby Polo": "بولو رجبي مقلّم",
  "Cargo Jogger Pants": "بنطلون كارغو رياضي",
  "Side Stripe Tracksuit": "طقم رياضي بخطوط جانبية",
  "Hooded Raincoat": "معطف مطر بقبعة",
  "Plaid Flannel Shirt": "قميص فلانيل كاروهات",
  "Gentleman Vest & Shorts Set": "طقم جنتلمان بصدرية وشورت",
  "Cable Knit Cardigan": "كارديغان صوف مضفور",
  "Muslin Shirt & Shorts Set": "طقم قميص وشورت موسلين",
  "Sun & Waves Swim Set": "طقم سباحة الشمس والأمواج",
};

const CATEGORY_COPY: Record<string, string> = {
  dresses: "Made for parties, holidays and everyday wear, with neat finishing and colours that look great on the shop floor.",
  sets: "A coordinated outfit that sells as a ready-made look and is easy to merchandise in store or online.",
  tops: "A reliable everyday basic with a comfortable fit and seams that hold up to frequent washing.",
  bottoms: "Comfortable fit with a soft waistband for easy dressing, built for active kids.",
  hoodies: "A warm, cosy layer with a brushed inside and a steady seller in the cold season.",
  outerwear: "Weather-ready outerwear with quality zips and warm padding, popular for autumn and winter orders.",
  sleepwear: "Soft, breathable sleepwear with gentle elastic and smooth seams.",
  baby: "Gentle on delicate skin, with easy snap fastenings for quick changes.",
  shoes: "Light, flexible shoes with a non-slip sole and an easy fastening for little feet.",
  accessories: "Finishing touches that sell well next to dresses and sets, packed ready for display.",
};

const WEIGHT_PER_PIECE: Record<string, number> = {
  romper: 0.09, tshirt: 0.12, longsleeve: 0.15, dress: 0.22, skirt: 0.15, pants: 0.2,
  shorts: 0.13, hoodie: 0.32, jacket: 0.5, set: 0.22, pajama: 0.25, tracksuit: 0.4,
  shoes: 0.28, bow: 0.03,
};

type Spec = {
  name: string;
  cat: string;
  art: string;
  pattern?: string;
  print?: string;
  accent?: string;
  gender: "GIRL" | "BOY" | "UNISEX";
  age: "BABY" | "KIDS" | "JUNIOR";
  season: "SPRING_SUMMER" | "AUTUMN_WINTER" | "ALL_SEASON";
  fabric: string;
  price: number;
  colors: ColorKey[];
  sizes?: readonly string[];
  minSeries?: number;
  tiers?: false;
  featured?: boolean;
  /** Product photo in public/images/products (single-colour products). */
  photo?: string;
};

type StoreSeed = {
  key: string;
  email: string;
  owner: string;
  status?: "PENDING";
  skuPrefix: string;
  store: {
    name: string;
    country: string;
    city: string;
    businessType: "MANUFACTURER" | "WHOLESALER" | "IMPORTER";
    foundedYear: number;
    minOrderAmount: number;
    brandColor: string;
    tagline: string;
    description: string;
    shippingInfo: string;
    paymentInfo: string;
    verified: boolean;
  };
  products: Spec[];
};

const STORES: StoreSeed[] = [
  {
    key: "pamuk",
    email: "wholesaler@cotonia.test",
    owner: "Mehmet Yildiz",
    skuPrefix: "PB",
    store: {
      name: "Pamuk Baby Textile",
      country: "TR",
      city: "Bursa",
      businessType: "MANUFACTURER",
      foundedYear: 2009,
      minOrderAmount: 300,
      brandColor: "#5AA9F2",
      tagline: "Organic cotton essentials for babies",
      description:
        "Family-run baby wear manufacturer in Bursa. We knit, dye and sew in-house, so we can offer steady quality, custom colours from 50 series and fast re-orders for boutiques worldwide.",
      shippingInfo:
        "Express courier or sea freight worldwide. Orders leave our warehouse 5–7 working days after payment. We can also hand over to your own cargo agent in Istanbul.",
      paymentInfo: "Bank transfer in USD or EUR. 30% deposit on orders above $5,000, balance before shipping.",
      verified: true,
    },
    products: [
      { name: "Organic Cotton Short Sleeve Bodysuit", cat: "baby", art: "romper", gender: "UNISEX", age: "BABY", season: "ALL_SEASON", fabric: "100% organic cotton interlock", price: 2.4, colors: ["white", "mint", "sky"], featured: true },
      { name: "Ribbed Long Sleeve Romper", cat: "baby", art: "romper", pattern: "stripes", gender: "UNISEX", age: "BABY", season: "AUTUMN_WINTER", fabric: "95% cotton, 5% elastane rib", price: 3.6, colors: ["beige", "sage", "blush"] },
      { name: "Star Print Baby Pajama Set", cat: "sleepwear", art: "pajama", pattern: "stars", gender: "UNISEX", age: "BABY", season: "ALL_SEASON", fabric: "100% cotton jersey", price: 4.2, colors: ["sky", "lilac"], featured: true },
      { name: "Teddy Fleece Baby Jacket", cat: "outerwear", art: "jacket", gender: "UNISEX", age: "BABY", season: "AUTUMN_WINTER", fabric: "100% polyester teddy fleece", price: 6.8, colors: ["beige", "peach"] },
      { name: "Muslin Summer Romper", cat: "baby", art: "romper", pattern: "checks", gender: "GIRL", age: "BABY", season: "SPRING_SUMMER", fabric: "100% cotton muslin", price: 3.2, colors: ["peach", "mint"] },
      { name: "Cotton Baby Jogger Pants", cat: "bottoms", art: "pants", gender: "UNISEX", age: "BABY", season: "ALL_SEASON", fabric: "100% cotton french terry", price: 2.1, colors: ["grey", "navy", "beige"], minSeries: 2 },
      { name: "Heart Print Bodysuit", cat: "baby", art: "romper", print: "heart", gender: "GIRL", age: "BABY", season: "ALL_SEASON", fabric: "100% cotton", price: 2.6, colors: ["blush", "white"] },
      { name: "Soft Sole Baby Shoes", cat: "shoes", art: "shoes", gender: "UNISEX", age: "BABY", season: "ALL_SEASON", fabric: "Cotton canvas upper, soft suede sole", price: 3.9, colors: ["blush", "sky", "white"], sizes: SIZES.SHOES_BABY, featured: true },
      { name: "Striped Peach Bodysuit", cat: "baby", art: "romper", gender: "UNISEX", age: "BABY", season: "SPRING_SUMMER", fabric: "100% organic cotton rib, embroidered peach", price: 2.9, colors: ["peach"], photo: "peach-striped-bodysuit", featured: true },
      { name: "Leather Mary Jane First Shoes", cat: "shoes", art: "shoes", gender: "GIRL", age: "BABY", season: "ALL_SEASON", fabric: "Soft PU leather, buckle strap, rubber sole", price: 6.4, colors: ["blush"], sizes: SIZES.SHOES_BABY, photo: "mary-jane-shoes", featured: true },
      { name: "Moon & Stars Pajama Set", cat: "sleepwear", art: "pajama", gender: "UNISEX", age: "KIDS", season: "ALL_SEASON", fabric: "100% cotton jersey, glow print", price: 4.6, colors: ["lilac"], photo: "moon-pajamas" },
      { name: "Sherpa Fleece Vest", cat: "outerwear", art: "jacket", gender: "UNISEX", age: "KIDS", season: "AUTUMN_WINTER", fabric: "Polyester sherpa with woven trims", price: 7.2, colors: ["beige"], photo: "sherpa-vest", featured: true },
    ],
  },
  {
    key: "lale",
    email: "lale@cotonia.test",
    owner: "Ayse Demir",
    skuPrefix: "LK",
    store: {
      name: "Lale Kids Fashion",
      country: "TR",
      city: "Istanbul",
      businessType: "MANUFACTURER",
      foundedYear: 2012,
      minOrderAmount: 400,
      brandColor: "#E86A92",
      tagline: "Party dresses and girls' outfits from Istanbul",
      description:
        "Girls' fashion label producing dresses, skirts and sets in Istanbul. Two new collections a year, with small-batch capsules for boutiques.",
      shippingInfo: "Courier delivery to Europe in 3–5 days and to the Gulf in 4–6 days. Cargo agent pick-up in Istanbul is free.",
      paymentInfo: "Bank transfer or card payment link. Full payment before dispatch.",
      verified: true,
    },
    products: [
      { name: "Tulle Party Dress", cat: "dresses", art: "dress", gender: "GIRL", age: "KIDS", season: "ALL_SEASON", fabric: "Polyester tulle with cotton lining", price: 9.5, colors: ["blush", "lilac", "white"], sizes: SIZES.KIDS_B, featured: true },
      { name: "Polka Dot Summer Dress", cat: "dresses", art: "dress", pattern: "dots", gender: "GIRL", age: "KIDS", season: "SPRING_SUMMER", fabric: "100% cotton poplin", price: 6.4, colors: ["yellow", "sky", "red"] },
      { name: "Pleated Tutu Skirt", cat: "dresses", art: "skirt", gender: "GIRL", age: "KIDS", season: "ALL_SEASON", fabric: "Polyester tulle, elastic waist", price: 4.8, colors: ["blush", "lilac", "mint"] },
      { name: "Ruffle Top & Shorts Set", cat: "sets", art: "set", accent: "#E86A92", gender: "GIRL", age: "KIDS", season: "SPRING_SUMMER", fabric: "95% cotton, 5% elastane", price: 5.9, colors: ["white", "yellow"] },
      { name: "Gingham Pinafore Dress", cat: "dresses", art: "dress", pattern: "checks", gender: "GIRL", age: "KIDS", season: "SPRING_SUMMER", fabric: "100% cotton gingham", price: 7.2, colors: ["red", "sky"], sizes: SIZES.KIDS_C },
      { name: "Velvet Holiday Dress", cat: "dresses", art: "dress", gender: "GIRL", age: "JUNIOR", season: "AUTUMN_WINTER", fabric: "Stretch velvet with satin lining", price: 11.5, colors: ["red", "navy"] },
      { name: "Rainbow Graphic Tee", cat: "tops", art: "tshirt", print: "rainbow", gender: "GIRL", age: "KIDS", season: "SPRING_SUMMER", fabric: "100% combed cotton", price: 2.9, colors: ["white", "lilac"] },
      { name: "Glitter Ballet Flats", cat: "shoes", art: "shoes", gender: "GIRL", age: "KIDS", season: "ALL_SEASON", fabric: "Glitter PU upper, rubber sole", price: 5.6, colors: ["blush", "lilac", "white"], sizes: SIZES.SHOES_KIDS },
      { name: "Satin Hair Bow Clips", cat: "accessories", art: "bow", gender: "GIRL", age: "KIDS", season: "ALL_SEASON", fabric: "Satin ribbon on metal clip", price: 0.9, colors: ["blush", "red", "white", "lilac"], sizes: SIZES.ONE_SIZE, minSeries: 20, featured: true },
      { name: "Velvet Bow Headband", cat: "accessories", art: "bow", gender: "GIRL", age: "KIDS", season: "AUTUMN_WINTER", fabric: "Velvet bow on padded headband", price: 1.4, colors: ["navy", "rose", "red"], sizes: SIZES.ONE_SIZE, minSeries: 20 },
      { name: "Lilac Tulle Flower Dress", cat: "dresses", art: "dress", gender: "GIRL", age: "KIDS", season: "ALL_SEASON", fabric: "Satin bodice, layered tulle skirt", price: 10.8, colors: ["lilac"], sizes: SIZES.KIDS_B, photo: "lilac-tulle-dress", featured: true },
      { name: "Strawberry Collar Blouse", cat: "tops", art: "tshirt", gender: "GIRL", age: "KIDS", season: "SPRING_SUMMER", fabric: "100% cotton poplin, embroidered collar", price: 5.4, colors: ["cream"], photo: "strawberry-blouse", featured: true },
      { name: "Pleated Twill Skirt", cat: "dresses", art: "skirt", gender: "GIRL", age: "KIDS", season: "AUTUMN_WINTER", fabric: "Cotton twill", price: 4.9, colors: ["berry"], photo: "pleated-skirt" },
      { name: "Gingham Pocket Sundress", cat: "dresses", art: "dress", gender: "GIRL", age: "KIDS", season: "SPRING_SUMMER", fabric: "Cotton seersucker gingham", price: 6.2, colors: ["yellow"], photo: "gingham-sundress", featured: true },
      { name: "Grosgrain Hair Bow", cat: "accessories", art: "bow", gender: "GIRL", age: "KIDS", season: "ALL_SEASON", fabric: "Grosgrain ribbon on alligator clip", price: 0.8, colors: ["rose"], sizes: SIZES.ONE_SIZE, minSeries: 20, photo: "grosgrain-bow", featured: true },
    ],
  },
  {
    key: "denizli",
    email: "denizli@cotonia.test",
    owner: "Emre Kaya",
    skuPrefix: "DJ",
    store: {
      name: "Denizli Junior Wear",
      country: "TR",
      city: "Denizli",
      businessType: "MANUFACTURER",
      foundedYear: 2004,
      minOrderAmount: 350,
      brandColor: "#3CBFA0",
      tagline: "Everyday cotton basics for boys and girls",
      description:
        "Vertical cotton manufacturer in Denizli, one of Türkiye's textile capitals. Basics, polos and denim in deep colour ranges, ready to ship all year.",
      shippingInfo: "Road freight to Europe, air cargo worldwide. Dispatch within 3 working days for stock items.",
      paymentInfo: "Bank transfer. Letters of credit accepted for orders above $20,000.",
      verified: true,
    },
    products: [
      { name: "Basic Crew Neck Tee", cat: "tops", art: "tshirt", gender: "UNISEX", age: "KIDS", season: "ALL_SEASON", fabric: "100% combed cotton, 160 gsm", price: 1.9, colors: ["white", "navy", "grey", "mustard"], minSeries: 3, featured: true },
      { name: "Striped Long Sleeve Top", cat: "tops", art: "longsleeve", pattern: "stripes", gender: "UNISEX", age: "KIDS", season: "AUTUMN_WINTER", fabric: "100% cotton jersey", price: 3.1, colors: ["navy", "red"] },
      { name: "Star Tee & Shorts Set", cat: "sets", art: "set", print: "star", accent: "#2E3A66", gender: "BOY", age: "KIDS", season: "SPRING_SUMMER", fabric: "100% cotton", price: 4.5, colors: ["sky", "mustard"] },
      { name: "Cotton Bermuda Shorts", cat: "bottoms", art: "shorts", gender: "BOY", age: "KIDS", season: "SPRING_SUMMER", fabric: "100% cotton twill", price: 2.8, colors: ["khaki", "navy", "olive"], sizes: SIZES.KIDS_C },
      { name: "Denim Jogger Pants", cat: "bottoms", art: "pants", gender: "UNISEX", age: "JUNIOR", season: "ALL_SEASON", fabric: "98% cotton, 2% elastane denim", price: 4.9, colors: ["denim", "charcoal"] },
      { name: "Pique Polo Shirt", cat: "tops", art: "tshirt", gender: "BOY", age: "JUNIOR", season: "SPRING_SUMMER", fabric: "100% cotton pique", price: 3.4, colors: ["white", "sky", "green"] },
      { name: "Canvas Sneakers", cat: "shoes", art: "shoes", accent: "#FFFFFF", gender: "UNISEX", age: "KIDS", season: "SPRING_SUMMER", fabric: "Cotton canvas upper, rubber sole, hook-and-loop strap", price: 4.7, colors: ["navy", "red", "white"], sizes: SIZES.SHOES_KIDS },
      { name: "Wide-Leg Denim Jeans", cat: "bottoms", art: "pants", gender: "UNISEX", age: "KIDS", season: "ALL_SEASON", fabric: "100% cotton denim, adjustable waist", price: 6.9, colors: ["indigo"], photo: "wide-leg-jeans", featured: true },
      { name: "Hot Air Balloon Sweatshirt", cat: "hoodies", art: "hoodie", gender: "UNISEX", age: "KIDS", season: "AUTUMN_WINTER", fabric: "Cotton fleece, applique embroidery", price: 5.8, colors: ["mustard"], photo: "balloon-sweatshirt", featured: true },
      { name: "Striped Rugby Polo", cat: "tops", art: "longsleeve", gender: "BOY", age: "KIDS", season: "AUTUMN_WINTER", fabric: "Heavy cotton jersey, twill collar", price: 5.2, colors: ["navy"], photo: "rugby-polo" },
      { name: "Cargo Jogger Pants", cat: "bottoms", art: "pants", gender: "BOY", age: "KIDS", season: "ALL_SEASON", fabric: "Cotton twill, elastic cuffs", price: 4.8, colors: ["khaki"], photo: "cargo-pants" },
      { name: "Side Stripe Tracksuit", cat: "hoodies", art: "tracksuit", gender: "UNISEX", age: "KIDS", season: "ALL_SEASON", fabric: "Polyester-cotton tricot", price: 7.6, colors: ["royal"], photo: "track-suit" },
    ],
  },
  {
    key: "redkite",
    email: "redkite@cotonia.test",
    owner: "Li Wei",
    skuPrefix: "RK",
    store: {
      name: "Red Kite Apparel",
      country: "CN",
      city: "Guangzhou",
      businessType: "MANUFACTURER",
      foundedYear: 2011,
      minOrderAmount: 800,
      brandColor: "#D9434E",
      tagline: "Outerwear and hoodies at factory prices",
      description:
        "Outerwear factory with 3 production lines. Puffer jackets, windbreakers, hoodies and tracksuits, with private label available from 300 pieces per style.",
      shippingInfo: "Sea freight (FOB Guangzhou) or air express. Production lead time 25–35 days for made-to-order styles.",
      paymentInfo: "Bank transfer: 30% deposit, 70% before shipment.",
      verified: true,
    },
    products: [
      { name: "Quilted Puffer Jacket", cat: "outerwear", art: "jacket", gender: "UNISEX", age: "KIDS", season: "AUTUMN_WINTER", fabric: "Nylon shell, polyester fill", price: 12.5, colors: ["red", "navy", "mustard"], sizes: SIZES.KIDS_C, minSeries: 2, featured: true },
      { name: "Hooded Windbreaker", cat: "outerwear", art: "jacket", gender: "UNISEX", age: "KIDS", season: "SPRING_SUMMER", fabric: "Water-resistant polyester", price: 8.9, colors: ["yellow", "blue"], minSeries: 2 },
      { name: "Kangaroo Pocket Hoodie", cat: "hoodies", art: "hoodie", gender: "UNISEX", age: "KIDS", season: "AUTUMN_WINTER", fabric: "80% cotton, 20% polyester fleece", price: 5.6, colors: ["grey", "coral", "sky"], minSeries: 2 },
      { name: "Zip Tracksuit Set", cat: "hoodies", art: "tracksuit", accent: "#2E3A66", gender: "BOY", age: "KIDS", season: "AUTUMN_WINTER", fabric: "100% polyester tricot", price: 9.8, colors: ["grey", "red"], minSeries: 2 },
      { name: "Smiley Fleece Hoodie", cat: "hoodies", art: "hoodie", print: "smile", gender: "UNISEX", age: "JUNIOR", season: "AUTUMN_WINTER", fabric: "Brushed cotton-blend fleece", price: 6.9, colors: ["mustard", "mint"], minSeries: 2 },
      { name: "Teen Bomber Jacket", cat: "outerwear", art: "jacket", gender: "BOY", age: "JUNIOR", season: "AUTUMN_WINTER", fabric: "Nylon shell, padded lining", price: 13.9, colors: ["olive", "charcoal"], minSeries: 2 },
      { name: "Winter Ankle Boots", cat: "shoes", art: "shoes", gender: "UNISEX", age: "KIDS", season: "AUTUMN_WINTER", fabric: "Water-resistant PU upper, warm fleece lining", price: 7.9, colors: ["camel", "charcoal"], sizes: SIZES.SHOES_KIDS, minSeries: 2 },
      { name: "Hooded Raincoat", cat: "outerwear", art: "jacket", gender: "UNISEX", age: "KIDS", season: "AUTUMN_WINTER", fabric: "Waterproof PU shell, striped jersey lining", price: 8.4, colors: ["forest"], photo: "raincoat", featured: true },
      { name: "Plaid Flannel Shirt", cat: "tops", art: "longsleeve", gender: "BOY", age: "KIDS", season: "AUTUMN_WINTER", fabric: "Brushed cotton flannel", price: 5.6, colors: ["burgundy"], photo: "plaid-flannel-shirt" },
    ],
  },
  {
    key: "goldenfiber",
    email: "goldenfiber@cotonia.test",
    owner: "Rahim Uddin",
    skuPrefix: "GF",
    store: {
      name: "Golden Fiber Kids",
      country: "BD",
      city: "Dhaka",
      businessType: "MANUFACTURER",
      foundedYear: 2015,
      minOrderAmount: 1000,
      brandColor: "#E0A526",
      tagline: "High-volume basics and sleepwear",
      description:
        "Knitwear factory focused on large-volume basics: tees, leggings, shorts and pajamas. Best prices from 100 series per style.",
      shippingInfo: "Sea freight from Chattogram. Air cargo on request. Lead time 30–45 days.",
      paymentInfo: "Bank transfer or letter of credit.",
      verified: false,
    },
    products: [
      { name: "Cotton Pajama Set", cat: "sleepwear", art: "pajama", pattern: "dots", gender: "UNISEX", age: "KIDS", season: "ALL_SEASON", fabric: "100% cotton jersey", price: 3.4, colors: ["sky", "blush", "mint"], minSeries: 5, featured: true },
      { name: "Moon & Stars Pajamas", cat: "sleepwear", art: "pajama", pattern: "stars", print: "moon", gender: "UNISEX", age: "KIDS", season: "ALL_SEASON", fabric: "100% cotton interlock", price: 3.9, colors: ["navy", "lilac"], minSeries: 5 },
      { name: "Essential Cotton Tee", cat: "tops", art: "tshirt", gender: "UNISEX", age: "KIDS", season: "ALL_SEASON", fabric: "100% cotton, 150 gsm", price: 1.5, colors: ["white", "coral", "yellow", "green", "blue"], minSeries: 10 },
      { name: "Cotton Leggings", cat: "bottoms", art: "pants", gender: "GIRL", age: "KIDS", season: "ALL_SEASON", fabric: "95% cotton, 5% elastane", price: 1.7, colors: ["charcoal", "blush", "navy"], minSeries: 10 },
      { name: "Long Sleeve Sleep Romper", cat: "baby", art: "romper", gender: "UNISEX", age: "BABY", season: "AUTUMN_WINTER", fabric: "100% cotton rib", price: 2.2, colors: ["white", "grey"], minSeries: 6 },
      { name: "Jersey Shorts", cat: "bottoms", art: "shorts", gender: "UNISEX", age: "KIDS", season: "SPRING_SUMMER", fabric: "100% cotton jersey", price: 1.6, colors: ["navy", "grey", "red"], minSeries: 10 },
    ],
  },
  {
    key: "nile",
    email: "nilecotton@cotonia.test",
    owner: "Omar Hassan",
    skuPrefix: "NC",
    store: {
      name: "Nile Cotton Kids",
      country: "EG",
      city: "Cairo",
      businessType: "WHOLESALER",
      foundedYear: 2010,
      minOrderAmount: 250,
      brandColor: "#9B8AF0",
      tagline: "Egyptian cotton sets and pajamas",
      description:
        "Wholesaler of Egyptian cotton kidswear, sourcing from partner workshops in Cairo and Alexandria. Strong in sleepwear and summer sets.",
      shippingInfo: "Air cargo to the Gulf and Africa, sea freight to Europe. Dispatch within 7 days.",
      paymentInfo: "Bank transfer in USD.",
      verified: true,
    },
    products: [
      { name: "Egyptian Cotton Pajama Set", cat: "sleepwear", art: "pajama", pattern: "checks", gender: "UNISEX", age: "KIDS", season: "ALL_SEASON", fabric: "100% Egyptian cotton", price: 5.2, colors: ["sky", "blush"], featured: true },
      { name: "Linen Shirt & Shorts Set", cat: "sets", art: "set", accent: "#E3CDB0", gender: "BOY", age: "KIDS", season: "SPRING_SUMMER", fabric: "55% linen, 45% cotton", price: 6.1, colors: ["white", "sky"] },
      { name: "Heart Print Tee", cat: "tops", art: "tshirt", print: "heart", gender: "GIRL", age: "KIDS", season: "SPRING_SUMMER", fabric: "100% cotton", price: 2.6, colors: ["blush", "white"] },
      { name: "Cotton Summer Dress", cat: "dresses", art: "dress", pattern: "dots", gender: "GIRL", age: "KIDS", season: "SPRING_SUMMER", fabric: "100% cotton voile", price: 5.4, colors: ["yellow", "coral"] },
      { name: "Striped Sleep Set", cat: "sleepwear", art: "pajama", pattern: "stripes", gender: "UNISEX", age: "JUNIOR", season: "ALL_SEASON", fabric: "100% cotton jersey", price: 4.4, colors: ["peach", "grey"] },
      { name: "Muslin Shirt & Shorts Set", cat: "sets", art: "set", gender: "BOY", age: "KIDS", season: "SPRING_SUMMER", fabric: "100% Egyptian cotton muslin", price: 6.6, colors: ["sage"], photo: "muslin-set", featured: true },
      { name: "Sun & Waves Swim Set", cat: "sets", art: "set", gender: "UNISEX", age: "KIDS", season: "SPRING_SUMMER", fabric: "UPF 50 rash guard, quick-dry shorts", price: 6.1, colors: ["teal"], photo: "sun-swim-set" },
    ],
  },
  {
    key: "bambino",
    email: "bambino@cotonia.test",
    owner: "Giulia Rossi",
    skuPrefix: "BM",
    store: {
      name: "Bambino Moda",
      country: "IT",
      city: "Prato",
      businessType: "WHOLESALER",
      foundedYear: 1998,
      minOrderAmount: 600,
      brandColor: "#2E3A66",
      tagline: "Italian-designed occasion wear",
      description:
        "Premium kidswear wholesaler designing in Prato. Ceremony dresses, wool coats and tailored pieces for upscale boutiques.",
      shippingInfo: "Courier delivery across Europe in 2–4 days, worldwide in 5–8 days.",
      paymentInfo: "Bank transfer (SEPA or SWIFT). Payment in advance.",
      verified: true,
    },
    products: [
      { name: "Ceremony Tulle Dress", cat: "dresses", art: "dress", gender: "GIRL", age: "KIDS", season: "ALL_SEASON", fabric: "Silk-touch tulle, cotton lining", price: 18.5, colors: ["white", "blush"], featured: true, tiers: false },
      { name: "Double-Breasted Wool Coat", cat: "outerwear", art: "jacket", gender: "UNISEX", age: "KIDS", season: "AUTUMN_WINTER", fabric: "60% wool, 40% polyester", price: 22, colors: ["camel", "navy"], tiers: false },
      { name: "Pleated Midi Skirt", cat: "dresses", art: "skirt", gender: "GIRL", age: "JUNIOR", season: "ALL_SEASON", fabric: "Polyester crepe", price: 9.9, colors: ["navy", "charcoal"] },
      { name: "Linen Trousers", cat: "bottoms", art: "pants", gender: "BOY", age: "KIDS", season: "SPRING_SUMMER", fabric: "100% linen", price: 11.2, colors: ["beige", "white"] },
      { name: "Cashmere-Touch Hoodie", cat: "hoodies", art: "hoodie", gender: "UNISEX", age: "JUNIOR", season: "AUTUMN_WINTER", fabric: "Soft-brushed viscose blend", price: 14.5, colors: ["grey", "beige"] },
      { name: "Gentleman Vest & Shorts Set", cat: "sets", art: "set", gender: "BOY", age: "KIDS", season: "SPRING_SUMMER", fabric: "Linen blend vest and shorts, cotton shirt, bow tie", price: 14.5, colors: ["camel"], photo: "gentleman-set", featured: true },
      { name: "Cable Knit Cardigan", cat: "tops", art: "longsleeve", gender: "UNISEX", age: "KIDS", season: "AUTUMN_WINTER", fabric: "Cotton-wool blend knit", price: 9.2, colors: ["rust"], photo: "cable-cardigan" },
    ],
  },
  {
    key: "desertrose",
    email: "desertrose@cotonia.test",
    owner: "Khalid Al Mansoori",
    skuPrefix: "DR",
    store: {
      name: "Desert Rose Trading",
      country: "AE",
      city: "Dubai",
      businessType: "IMPORTER",
      foundedYear: 2017,
      minOrderAmount: 500,
      brandColor: "#C49A6C",
      tagline: "Fast re-export hub for the Gulf and Africa",
      description:
        "Importer and re-exporter based in Dubai. Ready stock from several factories, consolidated shipping to the GCC, East Africa and the Levant.",
      shippingInfo: "Consolidated sea and air cargo from Jebel Ali. GCC deliveries within 3–5 days.",
      paymentInfo: "Bank transfer in USD or AED. Cash on pick-up for local buyers.",
      verified: false,
    },
    products: [
      { name: "Eid Party Dress", cat: "dresses", art: "dress", gender: "GIRL", age: "KIDS", season: "ALL_SEASON", fabric: "Satin with tulle overlay", price: 8.8, colors: ["mustard", "rose"], featured: true, sizes: SIZES.KIDS_C },
      { name: "Boys Shirt & Shorts Set", cat: "sets", art: "set", accent: "#2E3A66", gender: "BOY", age: "KIDS", season: "SPRING_SUMMER", fabric: "100% cotton", price: 5.5, colors: ["white", "sky"], sizes: SIZES.KIDS_C },
      { name: "Heart Pattern Pajama Set", cat: "sleepwear", art: "pajama", pattern: "hearts", gender: "GIRL", age: "KIDS", season: "ALL_SEASON", fabric: "100% cotton", price: 3.6, colors: ["blush", "lilac"] },
      { name: "Smiley Jersey Tee", cat: "tops", art: "tshirt", print: "smile", gender: "UNISEX", age: "KIDS", season: "SPRING_SUMMER", fabric: "100% cotton jersey", price: 2.2, colors: ["yellow", "mint", "coral"] },
      { name: "Cargo Shorts", cat: "bottoms", art: "shorts", gender: "BOY", age: "JUNIOR", season: "SPRING_SUMMER", fabric: "100% cotton canvas", price: 3.3, colors: ["khaki", "olive"] },
      { name: "Light Puffer Vest", cat: "outerwear", art: "jacket", gender: "UNISEX", age: "KIDS", season: "AUTUMN_WINTER", fabric: "Nylon shell, light padding", price: 7.5, colors: ["navy", "red"] },
      { name: "Polka Dot Hair Bows", cat: "accessories", art: "bow", pattern: "dots", gender: "GIRL", age: "KIDS", season: "SPRING_SUMMER", fabric: "Cotton bows on elastic hair ties", price: 0.7, colors: ["yellow", "sky", "blush"], sizes: SIZES.ONE_SIZE, minSeries: 30 },
    ],
  },
  {
    key: "anka",
    email: "anka@cotonia.test",
    owner: "Selin Arslan",
    status: "PENDING",
    skuPrefix: "AN",
    store: {
      name: "Anka Kids Textile",
      country: "TR",
      city: "Gaziantep",
      businessType: "MANUFACTURER",
      foundedYear: 2019,
      minOrderAmount: 300,
      brandColor: "#FF7F66",
      tagline: "Knitwear and baby sets from Gaziantep",
      description: "New knitwear workshop applying to sell on the marketplace.",
      shippingInfo: "Courier and cargo agents in Istanbul.",
      paymentInfo: "Bank transfer.",
      verified: false,
    },
    products: [],
  },
];

// Company profiles (Alibaba-style "Company profile" tab).
const PROFILES: Record<string, {
  employees: string;
  factorySize?: number;
  productionLines?: number;
  monthlyCapacity: string;
  annualRevenue: string;
  exportMarkets: { region: string; share: number }[];
  mainProducts: string;
  certifications?: string;
}> = {
  pamuk: { employees: "51-100", factorySize: 3200, productionLines: 4, monthlyCapacity: "80,000 pieces", annualRevenue: "US$2.5M - 5M", exportMarkets: [{ region: "Europe", share: 45 }, { region: "Middle East", share: 30 }, { region: "North Africa", share: 15 }, { region: "Central Asia", share: 10 }], mainProducts: "Bodysuits, rompers, baby pajamas, jogger pants", certifications: "OEKO-TEX Standard 100, Organic cotton" },
  lale: { employees: "21-50", factorySize: 1500, productionLines: 2, monthlyCapacity: "25,000 pieces", annualRevenue: "US$1M - 2.5M", exportMarkets: [{ region: "Europe", share: 50 }, { region: "Middle East", share: 35 }, { region: "Eastern Europe", share: 15 }], mainProducts: "Party dresses, tutu skirts, girls' sets", certifications: "OEKO-TEX Standard 100" },
  denizli: { employees: "101-200", factorySize: 6000, productionLines: 6, monthlyCapacity: "150,000 pieces", annualRevenue: "US$5M - 10M", exportMarkets: [{ region: "Europe", share: 60 }, { region: "Middle East", share: 20 }, { region: "Africa", share: 20 }], mainProducts: "T-shirts, polo shirts, shorts, denim", certifications: "OEKO-TEX Standard 100, BSCI" },
  redkite: { employees: "201-500", factorySize: 12000, productionLines: 8, monthlyCapacity: "120,000 pieces", annualRevenue: "US$10M - 50M", exportMarkets: [{ region: "North America", share: 35 }, { region: "Europe", share: 35 }, { region: "Middle East", share: 15 }, { region: "Latin America", share: 15 }], mainProducts: "Puffer jackets, windbreakers, hoodies, tracksuits", certifications: "BSCI, ISO 9001" },
  goldenfiber: { employees: "501-1000", factorySize: 20000, productionLines: 14, monthlyCapacity: "500,000 pieces", annualRevenue: "US$10M - 50M", exportMarkets: [{ region: "Europe", share: 55 }, { region: "North America", share: 30 }, { region: "Asia", share: 15 }], mainProducts: "Basic tees, leggings, pajamas, shorts", certifications: "OEKO-TEX Standard 100, WRAP" },
  nile: { employees: "11-20", monthlyCapacity: "30,000 pieces", annualRevenue: "US$1M - 2.5M", exportMarkets: [{ region: "Middle East", share: 50 }, { region: "Africa", share: 40 }, { region: "Europe", share: 10 }], mainProducts: "Cotton pajama sets, summer sets, dresses" },
  bambino: { employees: "11-20", monthlyCapacity: "10,000 pieces", annualRevenue: "US$1M - 2.5M", exportMarkets: [{ region: "Europe", share: 80 }, { region: "Middle East", share: 20 }], mainProducts: "Ceremony dresses, wool coats, tailored pieces" },
  desertrose: { employees: "21-50", monthlyCapacity: "40,000 pieces", annualRevenue: "US$2.5M - 5M", exportMarkets: [{ region: "Middle East", share: 60 }, { region: "Africa", share: 30 }, { region: "South Asia", share: 10 }], mainProducts: "Occasion wear, sets, pajamas, basics" },
  anka: { employees: "11-20", monthlyCapacity: "15,000 pieces", annualRevenue: "Below US$1M", exportMarkets: [], mainProducts: "Knitwear, baby sets" },
};

// Production defaults per supplier: lead time, stock vs made-to-order, customization minimums.
const PRODUCTION: Record<string, { leadTime: number; readyToShip: boolean; logoMoq?: number; packagingMoq?: number }> = {
  pamuk: { leadTime: 5, readyToShip: true, logoMoq: 50, packagingMoq: 100 },
  lale: { leadTime: 4, readyToShip: true, logoMoq: 30 },
  denizli: { leadTime: 3, readyToShip: true, logoMoq: 100, packagingMoq: 200 },
  redkite: { leadTime: 30, readyToShip: false, logoMoq: 50, packagingMoq: 100 },
  goldenfiber: { leadTime: 35, readyToShip: false, logoMoq: 200, packagingMoq: 300 },
  nile: { leadTime: 7, readyToShip: true },
  bambino: { leadTime: 3, readyToShip: true },
  desertrose: { leadTime: 2, readyToShip: true },
  anka: { leadTime: 10, readyToShip: true },
};

const SERIES_PER_CARTON: Record<string, number> = {
  romper: 40, tshirt: 30, longsleeve: 25, dress: 15, skirt: 25, pants: 20,
  shorts: 30, hoodie: 12, jacket: 6, set: 15, pajama: 15, tracksuit: 8,
  shoes: 10, bow: 100,
};

const REVIEW_COMMENTS: Record<number, string[]> = {
  5: [
    "Great quality for the price. The fabric is soft and the sizes are true.",
    "Our customers love it. We already placed a second order.",
    "Fast dispatch and very good packaging. Everything arrived in perfect condition.",
    "Colours are exactly like the photos. Sold out in two weeks.",
    "Excellent stitching, not a single defect in the whole order.",
    "Very professional supplier, answered every question within hours.",
  ],
  4: [
    "Good quality. Shipping took a few days longer than expected.",
    "Nice product, the sizes run slightly small.",
    "Good value. The supplier was helpful with mixing colours.",
    "Solid basics, we will reorder for next season.",
  ],
  3: [
    "Quality is okay for the price, but one colour looked a bit different.",
    "Average. The packaging could be better.",
  ],
};

const RETAILERS = [
  { key: "steps", email: "retailer@cotonia.test", name: "Anna Weber", shopName: "Little Steps Boutique", businessType: "BOUTIQUE", country: "DE", city: "Berlin", address: "Kastanienallee 12, 10435 Berlin", website: "littlesteps.example" },
  { key: "minimoda", email: "minimoda@cotonia.test", name: "Sara Al Qahtani", shopName: "Mini Moda Store", businessType: "CHAIN", country: "SA", city: "Riyadh", address: "Olaya Street, Riyadh" },
  { key: "happykids", email: "happykids@cotonia.test", name: "Chinedu Okafor", shopName: "Happy Kids Shop", businessType: "BOUTIQUE", country: "NG", city: "Lagos", address: "Allen Avenue, Ikeja, Lagos" },
  { key: "kidscorner", email: "kidscorner@cotonia.test", name: "James Carter", shopName: "KidsCorner Online", businessType: "ONLINE_STORE", country: "GB", city: "Manchester", address: "Unit 4, Trafford Park, Manchester" },
  { key: "rainbow", email: "rainbow@cotonia.test", name: "Lina Haddad", shopName: "Rainbow Kids", businessType: "BOUTIQUE", country: "JO", city: "Amman", status: "PENDING" },
  { key: "petitmonde", email: "petitmonde@cotonia.test", name: "Yasmine Benali", shopName: "Petit Monde", businessType: "ONLINE_STORE", country: "MA", city: "Casablanca", status: "PENDING" },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ProductWithColors = Product & { colors: ProductColor[] };
type RetailerUser = User & { retailer: { shopName: string; country: string; city: string; address: string | null } | null };

function tiersFor(spec: Spec) {
  if (spec.tiers === false) return [];
  const min = spec.minSeries ?? 1;
  return [
    { minSeries: Math.max(10, min * 3), pricePerPiece: round2(spec.price * 0.94) },
    { minSeries: Math.max(30, min * 8), pricePerPiece: round2(spec.price * 0.88) },
  ];
}

async function wipe() {
  await prisma.review.deleteMany();
  await prisma.recentView.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.rfqQuote.deleteMany();
  await prisma.rfq.deleteMany();
  await prisma.orderEvent.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.productColor.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.session.deleteMany();
  await prisma.retailerProfile.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();
}

const STATUS_FLOW = ["PENDING", "CONFIRMED", "PAID", "SHIPPED", "DELIVERED"] as const;

type OrderSeed = {
  retailer: RetailerUser;
  store: Store;
  status: "PENDING" | "CONFIRMED" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  createdDaysAgo: number;
  lines: { product: ProductWithColors; color: number; series: number }[];
  method?: "SELLER_SHIPS" | "BUYER_CARGO";
  shippingCost?: number;
  tracking?: string;
  buyerNote?: string;
  sellerNote?: string;
};

async function createOrder(seed: OrderSeed) {
  const seriesByProduct = new Map<string, number>();
  for (const line of seed.lines) {
    seriesByProduct.set(line.product.id, (seriesByProduct.get(line.product.id) ?? 0) + line.series);
  }
  const items = seed.lines.map((line) => {
    const sizes = parseSizes(line.product.sizes);
    const color = line.product.colors[line.color % line.product.colors.length];
    const price = unitPrice(
      line.product.pricePerPiece,
      parseTiers(line.product.priceTiers),
      seriesByProduct.get(line.product.id)!,
    );
    return {
      productId: line.product.id,
      colorId: color.id,
      productName: line.product.name,
      sku: line.product.sku,
      colorName: color.name,
      colorHex: color.hex,
      imageUrl: color.imageUrl,
      sizes: line.product.sizes,
      series: line.series,
      piecesPerSeries: sizes.length,
      pricePerPiece: price,
      lineTotal: round2(price * sizes.length * line.series),
    };
  });
  const subtotal = round2(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const createdAt = daysAgo(seed.createdDaysAgo);

  // Build a believable status history between creation and now.
  const path: string[] =
    seed.status === "CANCELLED"
      ? ["PENDING", "CANCELLED"]
      : STATUS_FLOW.slice(0, STATUS_FLOW.indexOf(seed.status) + 1);
  const elapsed = NOW - createdAt.getTime();
  const events = path.map((status, index) => ({
    status,
    createdAt: new Date(createdAt.getTime() + (elapsed * index) / (path.length + 0.5)),
    note:
      status === "CONFIRMED" && seed.sellerNote
        ? seed.sellerNote
        : status === "CANCELLED"
          ? "Cancelled by the buyer."
          : status === "SHIPPED" && seed.tracking
            ? `Tracking number: ${seed.tracking}`
            : null,
  }));

  const confirmed = seed.status !== "PENDING" && seed.status !== "CANCELLED";
  const method = seed.method ?? "SELLER_SHIPS";
  const profile = seed.retailer.retailer!;
  return prisma.order.create({
    data: {
      number: `CT-${randomCode(6)}`,
      retailerId: seed.retailer.id,
      storeId: seed.store.id,
      status: seed.status,
      subtotal,
      shippingCost: confirmed ? (method === "BUYER_CARGO" ? 0 : (seed.shippingCost ?? round2(subtotal * 0.08))) : null,
      shippingMethod: method,
      shipCountry: profile.country,
      shipCity: profile.city,
      shipAddress: profile.address ?? profile.city,
      contactPhone: seed.retailer.phone,
      buyerNote: seed.buyerNote ?? null,
      sellerNote: confirmed ? (seed.sellerNote ?? null) : null,
      trackingNumber: seed.tracking ?? null,
      createdAt,
      updatedAt: events[events.length - 1].createdAt,
      items: { create: items },
      events: { create: events },
    },
  });
}

type ThreadMessage = {
  from: "retailer" | "seller";
  body: string;
  hoursAgo: number;
  product?: Product;
  quantity?: number;
  rfqId?: string;
};

async function createThread(
  retailer: User,
  store: Store & { userId: string },
  messages: ThreadMessage[],
  unread: { retailer?: number; seller?: number } = {},
) {
  const last = messages[messages.length - 1];
  return prisma.conversation.create({
    data: {
      retailerId: retailer.id,
      storeId: store.id,
      lastMessage: last.body.slice(0, 160),
      lastMessageAt: hoursAgo(last.hoursAgo),
      retailerUnread: unread.retailer ?? 0,
      sellerUnread: unread.seller ?? 0,
      createdAt: hoursAgo(messages[0].hoursAgo),
      messages: {
        create: messages.map((message) => ({
          senderId: message.from === "retailer" ? retailer.id : store.userId,
          body: message.body,
          productId: message.product?.id ?? null,
          rfqId: message.rfqId ?? null,
          quantity: message.quantity ?? null,
          createdAt: hoursAgo(message.hoursAgo),
        })),
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Resetting demo data…");
  await wipe();
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const categories = new Map<string, string>();
  for (const [index, category] of CATEGORIES.entries()) {
    const created = await prisma.category.create({
      data: { ...category, nameTranslations: JSON.stringify({ ar: CATEGORY_AR[category.slug] }), sortOrder: index },
    });
    categories.set(category.slug, created.id);
  }

  await prisma.user.create({
    data: { email: "admin@cotonia.test", name: "Cotonia Admin", passwordHash, role: "ADMIN", status: "APPROVED", createdAt: daysAgo(400) },
  });

  // Wholesalers and their catalogs
  const stores = new Map<string, Store & { userId: string }>();
  const products = new Map<string, ProductWithColors[]>();
  for (const [storeIndex, seed] of STORES.entries()) {
    const user = await prisma.user.create({
      data: {
        email: seed.email,
        name: seed.owner,
        passwordHash,
        role: "WHOLESALER",
        status: seed.status ?? "APPROVED",
        createdAt: daysAgo(seed.status ? 2 : 380 - storeIndex * 35),
        store: {
          create: {
            ...seed.store,
            ...PROFILES[seed.key],
            exportMarkets: JSON.stringify(PROFILES[seed.key]?.exportMarkets ?? []),
            slug: slugify(seed.store.name),
            createdAt: daysAgo(seed.status ? 2 : 380 - storeIndex * 35),
          },
        },
      },
      include: { store: true },
    });
    stores.set(seed.key, user.store!);

    const list: ProductWithColors[] = [];
    for (const [index, spec] of seed.products.entries()) {
      const sizes = [...(spec.sizes ?? SIZES[spec.age])];
      const sku = `${seed.skuPrefix}-${1001 + index}`;
      const product = await prisma.product.create({
        data: {
          storeId: user.store!.id,
          categoryId: categories.get(spec.cat)!,
          sku,
          slug: `${slugify(spec.name)}-${sku.toLowerCase()}`,
          name: spec.name,
          nameTranslations: JSON.stringify(PRODUCT_AR[spec.name] ? { ar: PRODUCT_AR[spec.name] } : {}),
          description: `${CATEGORY_COPY[spec.cat]} Fabric: ${spec.fabric}. One series contains one piece in each size (${sizes.join(", ")}).`,
          gender: spec.gender,
          ageGroup: spec.age,
          season: spec.season,
          fabric: spec.fabric,
          origin: seed.store.country,
          sizes: JSON.stringify(sizes),
          pricePerPiece: spec.price,
          priceTiers: JSON.stringify(tiersFor(spec)),
          minSeries: spec.minSeries ?? 1,
          weightPerSeries: round2((WEIGHT_PER_PIECE[spec.art] ?? 0.2) * sizes.length),
          featured: spec.featured ?? false,
          readyToShip: PRODUCTION[seed.key].readyToShip,
          leadTimeDays: PRODUCTION[seed.key].leadTime,
          sampleAvailable: true,
          samplePrice: round2(spec.price * sizes.length * 1.6),
          customLogoMoq: PRODUCTION[seed.key].logoMoq ?? null,
          customPackagingMoq: PRODUCTION[seed.key].packagingMoq ?? null,
          seriesPerCarton: SERIES_PER_CARTON[spec.art] ?? 20,
          cartonSize: spec.art === "jacket" || spec.art === "tracksuit" ? "70 x 50 x 50 cm" : "60 x 40 x 40 cm",
          viewCount: between(80, 900) + (spec.featured ? 900 : 0),
          soldSeries: between(5, 250) + (spec.featured ? 350 : 0) + (spec.photo ? 300 : 0),
          createdAt: daysAgo(between(2, 150)),
          colors: {
            create: spec.colors.map((key, colorIndex) => {
              const [name, hex] = COLORS[key];
              return {
                name,
                hex,
                imageUrl:
                  spec.photo && colorIndex === 0
                    ? `/images/products/${spec.photo}.webp`
                    : artUrl(spec.art, hex, { pattern: spec.pattern, print: spec.print, accent: spec.accent }),
                stock: between(20, 240),
                sortOrder: colorIndex,
              };
            }),
          },
        },
        include: { colors: { orderBy: { sortOrder: "asc" } } },
      });
      list.push(product);
    }
    products.set(seed.key, list);
  }

  // Retailers
  const retailers = new Map<string, RetailerUser>();
  for (const [index, seed] of RETAILERS.entries()) {
    const status = "status" in seed ? seed.status : "APPROVED";
    const user = await prisma.user.create({
      data: {
        email: seed.email,
        name: seed.name,
        passwordHash,
        role: "RETAILER",
        status,
        createdAt: daysAgo(status === "PENDING" ? 1 + index : 300 - index * 40),
        retailer: {
          create: {
            shopName: seed.shopName,
            businessType: seed.businessType,
            country: seed.country,
            city: seed.city,
            address: "address" in seed ? seed.address : null,
            website: "website" in seed ? seed.website : null,
          },
        },
      },
      include: { retailer: true },
    });
    retailers.set(seed.key, user);
  }

  const R = (key: string) => retailers.get(key)!;
  const S = (key: string) => stores.get(key)!;
  const P = (key: string, index: number) => products.get(key)![index];

  // Orders: the demo retailer's history and the demo wholesaler's inbox
  console.log("Creating orders…");
  await createOrder({ retailer: R("steps"), store: S("pamuk"), status: "DELIVERED", createdDaysAgo: 58, lines: [{ product: P("pamuk", 0), color: 0, series: 30 }, { product: P("pamuk", 0), color: 1, series: 12 }, { product: P("pamuk", 2), color: 0, series: 10 }], tracking: "DHL 4821 7730 15", sellerNote: "Thank you! Express courier, 2 boxes." });
  await createOrder({ retailer: R("steps"), store: S("lale"), status: "SHIPPED", createdDaysAgo: 12, lines: [{ product: P("lale", 0), color: 0, series: 12 }, { product: P("lale", 0), color: 1, series: 10 }, { product: P("lale", 2), color: 2, series: 8 }], tracking: "UPS 1Z 99X 418 0362 7715", sellerNote: "All items in stock. Shipping by express courier." });
  await createOrder({ retailer: R("steps"), store: S("redkite"), status: "CONFIRMED", createdDaysAgo: 3, lines: [{ product: P("redkite", 0), color: 0, series: 10 }, { product: P("redkite", 0), color: 1, series: 8 }, { product: P("redkite", 2), color: 1, series: 6 }], shippingCost: 186, sellerNote: "Confirmed. Ready to ship 3 days after payment." });
  await createOrder({ retailer: R("steps"), store: S("goldenfiber"), status: "PENDING", createdDaysAgo: 1, lines: [{ product: P("goldenfiber", 0), color: 0, series: 40 }, { product: P("goldenfiber", 0), color: 2, series: 30 }], buyerNote: "Please confirm the delivery time to Berlin." });
  await createOrder({ retailer: R("steps"), store: S("bambino"), status: "CANCELLED", createdDaysAgo: 30, lines: [{ product: P("bambino", 1), color: 0, series: 6 }] });

  await createOrder({ retailer: R("minimoda"), store: S("pamuk"), status: "PENDING", createdDaysAgo: 0.2, lines: [{ product: P("pamuk", 2), color: 1, series: 24 }, { product: P("pamuk", 6), color: 0, series: 20 }], buyerNote: "Can you ship before the end of the month?" });
  await createOrder({ retailer: R("happykids"), store: S("pamuk"), status: "PAID", createdDaysAgo: 5, lines: [{ product: P("pamuk", 0), color: 2, series: 35 }, { product: P("pamuk", 5), color: 1, series: 20 }], method: "BUYER_CARGO", sellerNote: "Ready for pick-up by your cargo agent." });
  await createOrder({ retailer: R("kidscorner"), store: S("pamuk"), status: "DELIVERED", createdDaysAgo: 41, lines: [{ product: P("pamuk", 1), color: 0, series: 25 }, { product: P("pamuk", 3), color: 1, series: 15 }], tracking: "DHL 7731 2208 90" });
  await createOrder({ retailer: R("minimoda"), store: S("pamuk"), status: "CONFIRMED", createdDaysAgo: 2, lines: [{ product: P("pamuk", 4), color: 0, series: 30 }], shippingCost: 145 });
  await createOrder({ retailer: R("kidscorner"), store: S("redkite"), status: "PAID", createdDaysAgo: 9, lines: [{ product: P("redkite", 2), color: 0, series: 20 }, { product: P("redkite", 3), color: 1, series: 15 }] });
  await createOrder({ retailer: R("minimoda"), store: S("desertrose"), status: "DELIVERED", createdDaysAgo: 70, lines: [{ product: P("desertrose", 0), color: 0, series: 40 }, { product: P("desertrose", 1), color: 1, series: 30 }] });
  await createOrder({ retailer: R("happykids"), store: S("nile"), status: "SHIPPED", createdDaysAgo: 15, lines: [{ product: P("nile", 0), color: 1, series: 25 }, { product: P("nile", 3), color: 0, series: 20 }], tracking: "AWB 157-2290-4471" });

  // Buying requests (RFQ) with quotes
  console.log("Creating buying requests and messages…");
  const rfq = (data: { retailer: RetailerUser; cat: string; title: string; details: string; quantity: number; target?: number; days: number; status?: "CLOSED" }) =>
    prisma.rfq.create({
      data: {
        number: `RFQ-${randomCode(5)}`,
        retailerId: data.retailer.id,
        categoryId: categories.get(data.cat)!,
        title: data.title,
        details: data.details,
        quantity: data.quantity,
        targetPrice: data.target ?? null,
        destination: data.retailer.retailer!.country,
        status: data.status ?? "OPEN",
        createdAt: daysAgo(data.days),
        expiresAt: daysAgo(data.days - 30),
      },
    });
  const quote = (rfqId: string, store: Store, price: number, minQuantity: number, leadTimeDays: number, message: string, hours: number) =>
    prisma.rfqQuote.create({ data: { rfqId, storeId: store.id, pricePerPiece: price, minQuantity, leadTimeDays, message, createdAt: hoursAgo(hours) } });

  const dressesRfq = await rfq({ retailer: R("steps"), cat: "dresses", title: "Girls' summer dresses for a boutique, 2–8Y", details: "Looking for 3–4 cotton summer dress styles in bright colours for our spring window. Cotton or cotton-blend only, sizes 2–8 years. Mixed colours per style are fine.", quantity: 600, target: 6.5, days: 4 });
  await quote(dressesRfq.id, S("lale"), 6.8, 300, 21, "We can offer our Polka Dot and Gingham styles in 4 colours each, plus one new floral print. Samples can ship this week.", 70);
  await quote(dressesRfq.id, S("nile"), 5.9, 400, 30, "100% cotton voile dresses in 3 styles. Price includes neck labels with your brand.", 50);
  await quote(dressesRfq.id, S("desertrose"), 7.2, 200, 10, "Ready stock in Dubai, can dispatch within 10 days.", 20);

  const bodysuitRfq = await rfq({ retailer: R("steps"), cat: "baby", title: "Organic baby bodysuits in neutral colours", details: "Short and long sleeve organic cotton bodysuits, 0–18 months, in off-white, sage and sand. Neutral packaging, 5 per pack if possible.", quantity: 1200, target: 2.2, days: 9 });
  await quote(bodysuitRfq.id, S("pamuk"), 2.35, 600, 18, "Our organic interlock bodysuit fits this well. We can pack in 5-packs with a paper band for an extra $0.10 per piece.", 190);
  await quote(bodysuitRfq.id, S("goldenfiber"), 1.95, 2000, 45, "Best price from 2,000 pieces. Organic certificate available on request.", 160);

  const eidRfq = await rfq({ retailer: R("minimoda"), cat: "sets", title: "Eid outfits for boys, 4–12Y", details: "Smart shirt and trouser sets for Eid season. Light colours, good finishing. Need delivery to Riyadh within 6 weeks.", quantity: 900, target: 7, days: 6 });
  await quote(eidRfq.id, S("desertrose"), 6.9, 300, 12, "We have 4 styles in stock now and can deliver to Riyadh within 2 weeks.", 120);

  await rfq({ retailer: R("happykids"), cat: "tops", title: "School basics: polo shirts and shorts", details: "White and navy polo shirts plus navy shorts for the back-to-school season. Durable fabric, sizes 4–14 years.", quantity: 3000, target: 2.5, days: 2 });
  const pufferRfq = await rfq({ retailer: R("kidscorner"), cat: "outerwear", title: "Winter puffer jackets, 3–10Y", details: "Water-repellent puffer jackets with hood for the UK winter. 3 colours, reflective details are a plus.", quantity: 500, target: 11, days: 7 });
  await quote(pufferRfq.id, S("redkite"), 11.8, 300, 30, "Our Quilted Puffer can be made with a detachable hood and reflective strip. Lead time 30 days plus shipping.", 100);
  await rfq({ retailer: R("minimoda"), cat: "sleepwear", title: "Baby pajama sets 0–24M", details: "Soft cotton pajama sets with prints, for our 12 stores. Need hanging packaging.", quantity: 800, target: 3.8, days: 1 });
  await rfq({ retailer: R("happykids"), cat: "dresses", title: "Girls' party dresses", details: "Tulle party dresses for the holiday season.", quantity: 400, target: 8, days: 60, status: "CLOSED" });

  // Conversations
  await createThread(R("steps"), S("pamuk"), [
    { from: "retailer", body: "Hello! We're interested in your organic bodysuit for our spring range. Could we order 20 series in off-white and mint?", hoursAgo: 96, product: P("pamuk", 0), quantity: 20 },
    { from: "seller", body: "Hi Anna, thank you for your interest! Both colours are in stock. At 30+ series the price drops to the next tier, so mixing in sky blue could be worth it.", hoursAgo: 92 },
    { from: "retailer", body: "Good tip. Do you also offer custom neck labels with our shop name?", hoursAgo: 30 },
    { from: "seller", body: "Yes, from 50 series per style we can print your label inside the neck at no extra cost. I can send a mock-up today.", hoursAgo: 5 },
  ], { retailer: 1 });
  await createThread(R("steps"), S("lale"), [
    { from: "retailer", body: "Hi! Is the Tulle Party Dress available in a sage green colour for a minimum order?", hoursAgo: 220, product: P("lale", 0), quantity: 10 },
    { from: "seller", body: "Hello! We can dye it in sage from 30 series. Delivery would be about 3 weeks.", hoursAgo: 200 },
    { from: "retailer", body: "Perfect, I'll think about it and come back to you after this order arrives.", hoursAgo: 190 },
  ]);
  await createThread(R("minimoda"), S("pamuk"), [
    { from: "retailer", body: "Salam! We need 60 series of the Star Print Baby Pajama Set for our stores in Riyadh and Jeddah. What's your best price?", hoursAgo: 3, product: P("pamuk", 2), quantity: 60 },
  ], { seller: 1 });
  await createThread(R("happykids"), S("pamuk"), [
    { from: "retailer", body: "Hi, our cargo agent will collect the order in Istanbul. Which address should they use?", hoursAgo: 60 },
    { from: "seller", body: "We'll deliver to your agent's warehouse in Istanbul for free. Please send us their address and contact.", hoursAgo: 58 },
    { from: "retailer", body: "Thanks! I've sent the details by email. Payment is done.", hoursAgo: 26 },
  ]);
  await createThread(R("kidscorner"), S("redkite"), [
    { from: "seller", body: "Hi James, about your buying request for puffer jackets: we sent a quote with a detachable hood option. Happy to share photos of the reflective strip.", hoursAgo: 99, rfqId: pufferRfq.id },
    { from: "retailer", body: "Thanks, photos would help. Can you do a navy/orange colourway?", hoursAgo: 80 },
  ], { seller: 1 });

  // More buyer conversations, so suppliers get realistic response-rate metrics.
  await createThread(R("kidscorner"), S("lale"), [
    { from: "retailer", body: "Hi, do you have the Pleated Tutu Skirt in navy for winter?", hoursAgo: 150, product: P("lale", 2), quantity: 15 },
    { from: "seller", body: "Hello James! Navy is possible from 20 series, ready in 2 weeks.", hoursAgo: 147 },
  ]);
  await createThread(R("minimoda"), S("denizli"), [
    { from: "retailer", body: "We need 200 series of the Basic Crew Neck Tee in white for a promotion. Can you do a better price?", hoursAgo: 75, product: P("denizli", 0), quantity: 200 },
    { from: "seller", body: "Sure, for 200 series we can offer $1.62 per piece. Dispatch in 5 days.", hoursAgo: 74 },
  ]);
  await createThread(R("happykids"), S("goldenfiber"), [
    { from: "retailer", body: "What is the lead time for 100 series of the Cotton Pajama Set?", hoursAgo: 130, product: P("goldenfiber", 0), quantity: 100 },
    { from: "seller", body: "Lead time is 35 days plus shipping. We can send a sample first.", hoursAgo: 110 },
  ]);
  await createThread(R("kidscorner"), S("goldenfiber"), [
    { from: "retailer", body: "Can you print our own designs on the Essential Cotton Tee?", hoursAgo: 60, product: P("goldenfiber", 2) },
  ]);
  await createThread(R("steps"), S("nile"), [
    { from: "retailer", body: "Hello! Is the Egyptian Cotton Pajama Set available in sage green?", hoursAgo: 260, product: P("nile", 0), quantity: 12 },
    { from: "seller", body: "Hello Anna, not yet, but we are adding sage and lilac next month.", hoursAgo: 254 },
  ]);
  await createThread(R("minimoda"), S("bambino"), [
    { from: "retailer", body: "Do you offer the Ceremony Tulle Dress with long sleeves?", hoursAgo: 210, product: P("bambino", 0), quantity: 10 },
    { from: "seller", body: "Yes, a long-sleeve version is available for winter ceremonies.", hoursAgo: 208 },
  ]);
  await createThread(R("happykids"), S("desertrose"), [
    { from: "retailer", body: "Can you consolidate our order with goods from other suppliers in Dubai?", hoursAgo: 90 },
    { from: "seller", body: "Yes, we offer consolidation in our Jebel Ali warehouse for a small fee.", hoursAgo: 89 },
  ]);

  // Product reviews from retailers, plus the rating totals shown on cards.
  console.log("Creating reviews…");
  const reviewers = [R("steps"), R("minimoda"), R("happykids"), R("kidscorner")];
  for (const [key, list] of products) {
    for (const product of list) {
      if (rand() > 0.7) continue;
      const count = between(1, 3);
      const picked = [...reviewers].sort(() => rand() - 0.5).slice(0, count);
      const ratings: number[] = [];
      for (const reviewer of picked) {
        const roll = rand();
        const rating = roll < 0.6 ? 5 : roll < 0.9 ? 4 : 3;
        const comments = REVIEW_COMMENTS[rating];
        ratings.push(rating);
        await prisma.review.create({
          data: {
            productId: product.id,
            storeId: S(key).id,
            retailerId: reviewer.id,
            rating,
            comment: comments[between(0, comments.length - 1)],
            createdAt: daysAgo(between(4, 120)),
          },
        });
      }
      await prisma.product.update({
        where: { id: product.id },
        data: {
          ratingCount: ratings.length,
          ratingAvg: round2(ratings.reduce((sum, value) => sum + value, 0) / ratings.length),
        },
      });
    }
  }

  // Demo retailer: cart and saved products
  const steps = R("steps");
  const cart = [
    { product: P("pamuk", 0), color: 0, series: 20 },
    { product: P("pamuk", 0), color: 1, series: 15 },
    { product: P("pamuk", 2), color: 0, series: 5 },
    { product: P("denizli", 0), color: 1, series: 3 },
    { product: P("denizli", 0), color: 0, series: 3 },
  ];
  for (const item of cart) {
    await prisma.cartItem.create({
      data: { userId: steps.id, productId: item.product.id, colorId: item.product.colors[item.color].id, series: item.series },
    });
  }
  for (const product of [P("lale", 0), P("lale", 4), P("redkite", 0), P("nile", 0), P("bambino", 0)]) {
    await prisma.favorite.create({ data: { userId: steps.id, productId: product.id } });
  }

  const counts = {
    users: await prisma.user.count(),
    stores: await prisma.store.count(),
    products: await prisma.product.count(),
    orders: await prisma.order.count(),
    rfqs: await prisma.rfq.count(),
    conversations: await prisma.conversation.count(),
  };
  console.log("Done:", counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
