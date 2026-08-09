// Google Places (New) returns a `types` array per place, e.g.
// ["pizza_restaurant", "restaurant", "food", "point_of_interest"]. There is
// no Google API for a restaurant's actual menu, so once we know the cuisine
// we suggest commonly-ordered items for that cuisine as a starting point —
// the UI must make clear these are generic suggestions, not the
// restaurant's confirmed menu.

type CuisineEntry = {
  label: string;
  items: string[];
};

const CUISINE_MENUS: Record<string, CuisineEntry> = {
  pizza_restaurant: {
    label: "Pizza",
    items: [
      "Margherita Pizza",
      "Pepperoni Pizza",
      "Sausage Pizza",
      "Cheese Pizza",
      "Meat Lovers Pizza",
      "Veggie Pizza",
    ],
  },
  italian_restaurant: {
    label: "Italian",
    items: [
      "Spaghetti Bolognese",
      "Chicken Parmesan",
      "Fettuccine Alfredo",
      "Lasagna",
      "Margherita Pizza",
      "Caesar Salad",
    ],
  },
  chinese_restaurant: {
    label: "Chinese",
    items: [
      "Fried Rice",
      "Lo Mein",
      "General Tso's Chicken",
      "Orange Chicken",
      "Kung Pao Chicken",
      "Egg Rolls",
    ],
  },
  japanese_restaurant: {
    label: "Japanese",
    items: [
      "California Roll",
      "Spicy Tuna Roll",
      "Chicken Teriyaki",
      "Ramen",
      "Salmon Nigiri",
      "Gyoza",
    ],
  },
  sushi_restaurant: {
    label: "Sushi",
    items: [
      "California Roll",
      "Spicy Tuna Roll",
      "Salmon Nigiri",
      "Dragon Roll",
      "Miso Soup",
    ],
  },
  ramen_restaurant: {
    label: "Ramen",
    items: ["Tonkotsu Ramen", "Shoyu Ramen", "Miso Ramen", "Spicy Ramen", "Gyoza"],
  },
  indian_restaurant: {
    label: "Indian",
    items: [
      "Butter Chicken",
      "Chicken Tikka Masala",
      "Chicken Biryani",
      "Saag Paneer",
      "Garlic Naan",
      "Samosas",
    ],
  },
  thai_restaurant: {
    label: "Thai",
    items: [
      "Pad Thai",
      "Green Curry",
      "Tom Yum Soup",
      "Pad See Ew",
      "Basil Fried Rice",
      "Spring Rolls",
    ],
  },
  vietnamese_restaurant: {
    label: "Vietnamese",
    items: ["Pho", "Banh Mi", "Spring Rolls", "Bun Cha", "Vermicelli Bowl"],
  },
  korean_restaurant: {
    label: "Korean",
    items: [
      "Bibimbap",
      "Bulgogi",
      "Korean Fried Chicken",
      "Kimchi Fried Rice",
      "Japchae",
    ],
  },
  mexican_restaurant: {
    label: "Mexican",
    items: [
      "Chicken Burrito",
      "Carne Asada Tacos",
      "Chicken Quesadilla",
      "Burrito Bowl",
      "Chips and Guacamole",
    ],
  },
  mediterranean_restaurant: {
    label: "Mediterranean",
    items: [
      "Chicken Shawarma",
      "Falafel Wrap",
      "Hummus Plate",
      "Greek Salad",
      "Chicken Gyro",
    ],
  },
  greek_restaurant: {
    label: "Greek",
    items: ["Chicken Gyro", "Greek Salad", "Souvlaki", "Spanakopita", "Falafel Wrap"],
  },
  middle_eastern_restaurant: {
    label: "Middle Eastern",
    items: ["Chicken Shawarma", "Falafel Wrap", "Hummus Plate", "Kebab Platter"],
  },
  lebanese_restaurant: {
    label: "Lebanese",
    items: ["Chicken Shawarma", "Hummus Plate", "Falafel Wrap", "Kebab Platter"],
  },
  american_restaurant: {
    label: "American",
    items: [
      "Cheeseburger",
      "Bacon Burger",
      "Grilled Chicken Sandwich",
      "French Fries",
      "Caesar Salad",
    ],
  },
  hamburger_restaurant: {
    label: "Burgers",
    items: ["Cheeseburger", "Bacon Burger", "Double Burger", "French Fries", "Milkshake"],
  },
  fast_food_restaurant: {
    label: "Fast Food",
    items: [
      "Cheeseburger",
      "Chicken Sandwich",
      "French Fries",
      "Chicken Nuggets",
      "Milkshake",
    ],
  },
  barbecue_restaurant: {
    label: "BBQ",
    items: ["Pulled Pork Sandwich", "Brisket Plate", "Baby Back Ribs", "Mac and Cheese"],
  },
  steak_house: {
    label: "Steakhouse",
    items: ["Ribeye Steak", "Filet Mignon", "Grilled Chicken", "Baked Potato", "Caesar Salad"],
  },
  seafood_restaurant: {
    label: "Seafood",
    items: ["Fish and Chips", "Grilled Salmon", "Shrimp Scampi", "Clam Chowder", "Fish Tacos"],
  },
  sandwich_shop: {
    label: "Sandwiches",
    items: ["Turkey Club", "Italian Sub", "BLT", "Chicken Caesar Wrap", "Meatball Sub"],
  },
  breakfast_restaurant: {
    label: "Breakfast",
    items: [
      "Pancakes",
      "Avocado Toast",
      "Eggs Benedict",
      "Breakfast Burrito",
      "French Toast",
    ],
  },
  brunch_restaurant: {
    label: "Brunch",
    items: ["Avocado Toast", "Eggs Benedict", "Pancakes", "Breakfast Burrito", "Mimosa Flight"],
  },
  cafe: {
    label: "Cafe",
    items: ["Latte", "Cappuccino", "Cold Brew", "Croissant", "Avocado Toast"],
  },
  coffee_shop: {
    label: "Coffee",
    items: ["Latte", "Cappuccino", "Cold Brew", "Caramel Macchiato", "Croissant"],
  },
  bakery: {
    label: "Bakery",
    items: ["Croissant", "Bagel", "Blueberry Muffin", "Cinnamon Roll", "Sourdough Loaf"],
  },
  ice_cream_shop: {
    label: "Ice Cream",
    items: ["Vanilla Sundae", "Chocolate Milkshake", "Waffle Cone", "Banana Split"],
  },
  dessert_shop: {
    label: "Dessert",
    items: ["Chocolate Cake", "Cheesecake", "Brownie Sundae", "Churros"],
  },
  vegan_restaurant: {
    label: "Vegan",
    items: ["Buddha Bowl", "Vegan Burger", "Tofu Stir Fry", "Vegan Tacos"],
  },
  vegetarian_restaurant: {
    label: "Vegetarian",
    items: ["Veggie Burger", "Buddha Bowl", "Paneer Tikka", "Vegetable Curry"],
  },
  spanish_restaurant: {
    label: "Spanish",
    items: ["Paella", "Patatas Bravas", "Jamón Croquetas", "Tortilla Española"],
  },
  french_restaurant: {
    label: "French",
    items: ["Coq au Vin", "French Onion Soup", "Steak Frites", "Croque Monsieur"],
  },
  brazilian_restaurant: {
    label: "Brazilian",
    items: ["Picanha Steak", "Feijoada", "Coxinha", "Pão de Queijo"],
  },
  turkish_restaurant: {
    label: "Turkish",
    items: ["Chicken Doner", "Adana Kebab", "Baklava", "Lahmacun"],
  },
  pub: {
    label: "Pub",
    items: ["Fish and Chips", "Cheeseburger", "Loaded Nachos", "Buffalo Wings"],
  },
};

const GENERIC: CuisineEntry = {
  label: "Restaurant",
  items: [
    "Chef's Special",
    "House Favorite",
    "Grilled Chicken Plate",
    "Soup of the Day",
    "House Salad",
  ],
};

/** Resolve a Google Places `types` array to a cuisine label + common items.
 * Always returns something (falls back to a generic list) so the dropdown
 * has content even for cuisines we haven't curated yet. */
export function resolveCuisineMenu(types: string[]): {
  cuisineType: string;
  label: string;
  items: string[];
} {
  for (const type of types) {
    const entry = CUISINE_MENUS[type];
    if (entry) {
      return { cuisineType: type, label: entry.label, items: entry.items };
    }
  }
  return { cuisineType: "restaurant", label: GENERIC.label, items: GENERIC.items };
}
