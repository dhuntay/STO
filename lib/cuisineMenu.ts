// Google Places (New) returns a `types` array per place, e.g.
// ["chinese_restaurant", "restaurant", "food", "point_of_interest"]. There is
// no Google API for a restaurant's actual menu or prices, so once we know the
// cuisine we suggest commonly-ordered items for that cuisine — each with
// representative ingredients and a typical price — as a starting point the
// customer can adjust.
//
// These are placeholders standing in for real menu data. When SwipeOrder
// integrates with a restaurant's POS (Square et al.), the real item,
// ingredients and exact price should replace all of this.

export type MenuItem = {
  name: string;
  ingredients: string[];
  /** Typical total in USD, tax included. */
  price: number;
};

type CuisineEntry = {
  label: string;
  items: MenuItem[];
};

const CUISINE_MENUS: Record<string, CuisineEntry> = {
  pizza_restaurant: {
    label: "Pizza",
    items: [
      { name: "Margherita Pizza", ingredients: ["Mozzarella", "Tomato sauce", "Fresh basil"], price: 13.5 },
      { name: "Pepperoni Pizza", ingredients: ["Pepperoni", "Mozzarella", "Tomato sauce"], price: 15.0 },
      { name: "Sausage Pizza", ingredients: ["Italian sausage", "Mozzarella", "Tomato sauce"], price: 15.5 },
      { name: "Cheese Pizza", ingredients: ["Mozzarella", "Tomato sauce"], price: 12.5 },
      { name: "Meat Lovers Pizza", ingredients: ["Pepperoni", "Sausage", "Bacon", "Ham", "Mozzarella"], price: 18.5 },
      { name: "Veggie Pizza", ingredients: ["Bell peppers", "Mushrooms", "Red onion", "Olives", "Mozzarella"], price: 16.0 },
    ],
  },
  italian_restaurant: {
    label: "Italian",
    items: [
      { name: "Spaghetti Bolognese", ingredients: ["Spaghetti", "Beef ragu", "Parmesan"], price: 17.5 },
      { name: "Chicken Parmesan", ingredients: ["Breaded chicken", "Marinara", "Mozzarella", "Spaghetti"], price: 19.5 },
      { name: "Fettuccine Alfredo", ingredients: ["Fettuccine", "Cream", "Parmesan", "Butter"], price: 16.5 },
      { name: "Lasagna", ingredients: ["Pasta sheets", "Beef ragu", "Ricotta", "Mozzarella"], price: 18.0 },
      { name: "Margherita Pizza", ingredients: ["Mozzarella", "Tomato sauce", "Fresh basil"], price: 14.0 },
      { name: "Caesar Salad", ingredients: ["Romaine", "Parmesan", "Croutons", "Caesar dressing"], price: 11.0 },
    ],
  },
  chinese_restaurant: {
    label: "Chinese",
    items: [
      { name: "Fried Rice", ingredients: ["Rice", "Egg", "Peas and carrots", "Scallions"], price: 11.5 },
      { name: "Lo Mein", ingredients: ["Egg noodles", "Cabbage", "Carrots", "Soy sauce"], price: 12.5 },
      { name: "General Tso's Chicken", ingredients: ["Crispy chicken", "General Tso's sauce", "Broccoli", "Steamed rice"], price: 14.5 },
      { name: "Orange Chicken", ingredients: ["Crispy chicken", "Orange sauce", "Steamed rice"], price: 14.0 },
      { name: "Kung Pao Chicken", ingredients: ["Chicken", "Peanuts", "Dried chilies", "Bell peppers"], price: 14.0 },
      { name: "Egg Rolls", ingredients: ["Cabbage", "Carrots", "Pork", "Wrapper"], price: 6.5 },
    ],
  },
  japanese_restaurant: {
    label: "Japanese",
    items: [
      { name: "California Roll", ingredients: ["Crab", "Avocado", "Cucumber", "Sushi rice"], price: 9.5 },
      { name: "Spicy Tuna Roll", ingredients: ["Tuna", "Spicy mayo", "Sushi rice", "Nori"], price: 11.0 },
      { name: "Chicken Teriyaki", ingredients: ["Grilled chicken", "Teriyaki sauce", "Steamed rice"], price: 15.5 },
      { name: "Ramen", ingredients: ["Ramen noodles", "Pork broth", "Chashu pork", "Soft egg", "Scallions"], price: 16.0 },
      { name: "Salmon Nigiri", ingredients: ["Salmon", "Sushi rice"], price: 8.0 },
      { name: "Gyoza", ingredients: ["Pork", "Cabbage", "Garlic", "Dumpling wrapper"], price: 7.5 },
    ],
  },
  sushi_restaurant: {
    label: "Sushi",
    items: [
      { name: "California Roll", ingredients: ["Crab", "Avocado", "Cucumber", "Sushi rice"], price: 9.5 },
      { name: "Spicy Tuna Roll", ingredients: ["Tuna", "Spicy mayo", "Sushi rice", "Nori"], price: 11.0 },
      { name: "Salmon Nigiri", ingredients: ["Salmon", "Sushi rice"], price: 8.0 },
      { name: "Dragon Roll", ingredients: ["Eel", "Avocado", "Cucumber", "Eel sauce"], price: 15.0 },
      { name: "Miso Soup", ingredients: ["Miso broth", "Tofu", "Seaweed", "Scallions"], price: 4.5 },
    ],
  },
  ramen_restaurant: {
    label: "Ramen",
    items: [
      { name: "Tonkotsu Ramen", ingredients: ["Ramen noodles", "Pork bone broth", "Chashu pork", "Soft egg"], price: 17.0 },
      { name: "Shoyu Ramen", ingredients: ["Ramen noodles", "Soy-based broth", "Chicken", "Bamboo shoots"], price: 16.0 },
      { name: "Miso Ramen", ingredients: ["Ramen noodles", "Miso broth", "Corn", "Butter", "Scallions"], price: 16.5 },
      { name: "Spicy Ramen", ingredients: ["Ramen noodles", "Spicy miso broth", "Chili oil", "Pork"], price: 17.5 },
      { name: "Gyoza", ingredients: ["Pork", "Cabbage", "Garlic", "Dumpling wrapper"], price: 7.5 },
    ],
  },
  indian_restaurant: {
    label: "Indian",
    items: [
      { name: "Butter Chicken", ingredients: ["Chicken", "Tomato-butter sauce", "Cream", "Basmati rice"], price: 17.0 },
      { name: "Chicken Tikka Masala", ingredients: ["Chicken tikka", "Tomato-cream masala", "Basmati rice"], price: 17.5 },
      { name: "Chicken Biryani", ingredients: ["Basmati rice", "Chicken", "Biryani spices", "Fried onions"], price: 16.5 },
      { name: "Saag Paneer", ingredients: ["Spinach", "Paneer", "Cream", "Garam masala"], price: 15.0 },
      { name: "Garlic Naan", ingredients: ["Flour", "Garlic", "Butter", "Cilantro"], price: 4.5 },
      { name: "Samosas", ingredients: ["Potato", "Peas", "Cumin", "Pastry"], price: 6.5 },
    ],
  },
  thai_restaurant: {
    label: "Thai",
    items: [
      { name: "Pad Thai", ingredients: ["Rice noodles", "Egg", "Bean sprouts", "Crushed peanuts", "Tamarind sauce"], price: 15.0 },
      { name: "Green Curry", ingredients: ["Green curry paste", "Coconut milk", "Thai basil", "Jasmine rice"], price: 16.0 },
      { name: "Tom Yum Soup", ingredients: ["Lemongrass", "Shrimp", "Mushrooms", "Lime", "Chili"], price: 9.5 },
      { name: "Pad See Ew", ingredients: ["Wide rice noodles", "Chinese broccoli", "Egg", "Sweet soy sauce"], price: 15.0 },
      { name: "Basil Fried Rice", ingredients: ["Jasmine rice", "Thai basil", "Chili", "Egg"], price: 14.5 },
      { name: "Spring Rolls", ingredients: ["Cabbage", "Carrots", "Glass noodles", "Wrapper"], price: 7.0 },
    ],
  },
  vietnamese_restaurant: {
    label: "Vietnamese",
    items: [
      { name: "Pho", ingredients: ["Rice noodles", "Beef broth", "Sliced beef", "Thai basil", "Bean sprouts"], price: 15.0 },
      { name: "Banh Mi", ingredients: ["Baguette", "Grilled pork", "Pickled daikon", "Carrots", "Cilantro"], price: 10.5 },
      { name: "Spring Rolls", ingredients: ["Rice paper", "Shrimp", "Vermicelli", "Mint", "Peanut sauce"], price: 7.5 },
      { name: "Bun Cha", ingredients: ["Grilled pork", "Vermicelli", "Herbs", "Nuoc cham"], price: 15.5 },
      { name: "Vermicelli Bowl", ingredients: ["Vermicelli", "Grilled chicken", "Lettuce", "Peanuts", "Fish sauce"], price: 14.5 },
    ],
  },
  korean_restaurant: {
    label: "Korean",
    items: [
      { name: "Bibimbap", ingredients: ["Rice", "Seasoned vegetables", "Beef", "Fried egg", "Gochujang"], price: 16.5 },
      { name: "Bulgogi", ingredients: ["Marinated beef", "Onions", "Steamed rice"], price: 18.0 },
      { name: "Korean Fried Chicken", ingredients: ["Fried chicken", "Gochujang glaze", "Sesame seeds"], price: 17.5 },
      { name: "Kimchi Fried Rice", ingredients: ["Rice", "Kimchi", "Pork", "Fried egg"], price: 14.5 },
      { name: "Japchae", ingredients: ["Sweet potato noodles", "Vegetables", "Sesame oil", "Beef"], price: 15.5 },
    ],
  },
  mexican_restaurant: {
    label: "Mexican",
    items: [
      { name: "Chicken Burrito", ingredients: ["Flour tortilla", "Grilled chicken", "Rice", "Black beans", "Salsa"], price: 12.5 },
      { name: "Carne Asada Tacos", ingredients: ["Corn tortillas", "Grilled steak", "Onion", "Cilantro", "Lime"], price: 13.0 },
      { name: "Chicken Quesadilla", ingredients: ["Flour tortilla", "Grilled chicken", "Cheese", "Pico de gallo"], price: 11.5 },
      { name: "Burrito Bowl", ingredients: ["Cilantro-lime rice", "Black beans", "Grilled chicken", "Salsa", "Cheese"], price: 12.0 },
      { name: "Chips and Guacamole", ingredients: ["Tortilla chips", "Avocado", "Lime", "Onion", "Cilantro"], price: 6.5 },
    ],
  },
  mediterranean_restaurant: {
    label: "Mediterranean",
    items: [
      { name: "Chicken Shawarma", ingredients: ["Marinated chicken", "Pita", "Garlic sauce", "Pickles"], price: 14.0 },
      { name: "Falafel Wrap", ingredients: ["Falafel", "Pita", "Tahini", "Tomato", "Lettuce"], price: 12.0 },
      { name: "Hummus Plate", ingredients: ["Chickpeas", "Tahini", "Olive oil", "Pita"], price: 9.5 },
      { name: "Greek Salad", ingredients: ["Tomato", "Cucumber", "Red onion", "Feta", "Olives"], price: 11.5 },
      { name: "Chicken Gyro", ingredients: ["Chicken", "Pita", "Tzatziki", "Tomato", "Onion"], price: 13.5 },
    ],
  },
  greek_restaurant: {
    label: "Greek",
    items: [
      { name: "Chicken Gyro", ingredients: ["Chicken", "Pita", "Tzatziki", "Tomato", "Onion"], price: 13.5 },
      { name: "Greek Salad", ingredients: ["Tomato", "Cucumber", "Red onion", "Feta", "Olives"], price: 11.5 },
      { name: "Souvlaki", ingredients: ["Grilled pork skewers", "Pita", "Tzatziki", "Lemon"], price: 15.0 },
      { name: "Spanakopita", ingredients: ["Spinach", "Feta", "Phyllo pastry"], price: 8.5 },
      { name: "Falafel Wrap", ingredients: ["Falafel", "Pita", "Tahini", "Tomato"], price: 12.0 },
    ],
  },
  middle_eastern_restaurant: {
    label: "Middle Eastern",
    items: [
      { name: "Chicken Shawarma", ingredients: ["Marinated chicken", "Pita", "Garlic sauce", "Pickles"], price: 14.0 },
      { name: "Falafel Wrap", ingredients: ["Falafel", "Pita", "Tahini", "Tomato", "Lettuce"], price: 12.0 },
      { name: "Hummus Plate", ingredients: ["Chickpeas", "Tahini", "Olive oil", "Pita"], price: 9.5 },
      { name: "Kebab Platter", ingredients: ["Grilled kebab", "Rice", "Grilled tomato", "Salad"], price: 18.0 },
    ],
  },
  lebanese_restaurant: {
    label: "Lebanese",
    items: [
      { name: "Chicken Shawarma", ingredients: ["Marinated chicken", "Pita", "Garlic sauce", "Pickles"], price: 14.0 },
      { name: "Hummus Plate", ingredients: ["Chickpeas", "Tahini", "Olive oil", "Pita"], price: 9.5 },
      { name: "Falafel Wrap", ingredients: ["Falafel", "Pita", "Tahini", "Tomato"], price: 12.0 },
      { name: "Kebab Platter", ingredients: ["Grilled kebab", "Rice", "Grilled tomato", "Salad"], price: 18.0 },
    ],
  },
  american_restaurant: {
    label: "American",
    items: [
      { name: "Cheeseburger", ingredients: ["Beef patty", "Cheddar", "Lettuce", "Tomato", "Brioche bun"], price: 13.5 },
      { name: "Bacon Burger", ingredients: ["Beef patty", "Bacon", "Cheddar", "Onion", "Brioche bun"], price: 15.5 },
      { name: "Grilled Chicken Sandwich", ingredients: ["Grilled chicken", "Lettuce", "Tomato", "Mayo", "Bun"], price: 13.0 },
      { name: "French Fries", ingredients: ["Potatoes", "Salt"], price: 5.0 },
      { name: "Caesar Salad", ingredients: ["Romaine", "Parmesan", "Croutons", "Caesar dressing"], price: 11.0 },
    ],
  },
  hamburger_restaurant: {
    label: "Burgers",
    items: [
      { name: "Cheeseburger", ingredients: ["Beef patty", "American cheese", "Pickles", "Onion", "Bun"], price: 9.5 },
      { name: "Bacon Burger", ingredients: ["Beef patty", "Bacon", "Cheddar", "Lettuce", "Bun"], price: 11.5 },
      { name: "Double Burger", ingredients: ["Two beef patties", "Cheese", "Pickles", "Special sauce"], price: 12.5 },
      { name: "French Fries", ingredients: ["Potatoes", "Salt"], price: 4.5 },
      { name: "Milkshake", ingredients: ["Ice cream", "Milk", "Vanilla"], price: 6.0 },
    ],
  },
  fast_food_restaurant: {
    label: "Fast Food",
    items: [
      { name: "Cheeseburger", ingredients: ["Beef patty", "American cheese", "Pickles", "Ketchup", "Bun"], price: 7.5 },
      { name: "Chicken Sandwich", ingredients: ["Fried chicken", "Pickles", "Bun"], price: 8.5 },
      { name: "French Fries", ingredients: ["Potatoes", "Salt"], price: 4.0 },
      { name: "Chicken Nuggets", ingredients: ["Breaded chicken", "Dipping sauce"], price: 6.5 },
      { name: "Milkshake", ingredients: ["Ice cream", "Milk", "Vanilla"], price: 5.5 },
    ],
  },
  barbecue_restaurant: {
    label: "BBQ",
    items: [
      { name: "Pulled Pork Sandwich", ingredients: ["Smoked pulled pork", "BBQ sauce", "Coleslaw", "Bun"], price: 14.0 },
      { name: "Brisket Plate", ingredients: ["Smoked brisket", "BBQ sauce", "Pickles", "Texas toast"], price: 21.0 },
      { name: "Baby Back Ribs", ingredients: ["Pork ribs", "Dry rub", "BBQ sauce"], price: 24.0 },
      { name: "Mac and Cheese", ingredients: ["Macaroni", "Cheddar", "Cream"], price: 6.5 },
    ],
  },
  steak_house: {
    label: "Steakhouse",
    items: [
      { name: "Ribeye Steak", ingredients: ["Ribeye", "Butter", "Garlic", "Thyme"], price: 46.0 },
      { name: "Filet Mignon", ingredients: ["Beef tenderloin", "Butter", "Sea salt"], price: 52.0 },
      { name: "Grilled Chicken", ingredients: ["Chicken breast", "Herbs", "Lemon"], price: 27.0 },
      { name: "Baked Potato", ingredients: ["Potato", "Butter", "Sour cream", "Chives"], price: 9.0 },
      { name: "Caesar Salad", ingredients: ["Romaine", "Parmesan", "Croutons", "Caesar dressing"], price: 13.0 },
    ],
  },
  seafood_restaurant: {
    label: "Seafood",
    items: [
      { name: "Fish and Chips", ingredients: ["Battered cod", "Fries", "Tartar sauce", "Lemon"], price: 18.0 },
      { name: "Grilled Salmon", ingredients: ["Salmon fillet", "Lemon", "Herbs", "Seasonal vegetables"], price: 26.0 },
      { name: "Shrimp Scampi", ingredients: ["Shrimp", "Garlic", "White wine butter", "Linguine"], price: 24.0 },
      { name: "Clam Chowder", ingredients: ["Clams", "Potatoes", "Cream", "Bacon"], price: 9.5 },
      { name: "Fish Tacos", ingredients: ["Grilled fish", "Corn tortillas", "Cabbage slaw", "Lime crema"], price: 16.0 },
    ],
  },
  sandwich_shop: {
    label: "Sandwiches",
    items: [
      { name: "Turkey Club", ingredients: ["Turkey", "Bacon", "Lettuce", "Tomato", "Mayo"], price: 12.5 },
      { name: "Italian Sub", ingredients: ["Salami", "Ham", "Provolone", "Lettuce", "Italian dressing"], price: 13.0 },
      { name: "BLT", ingredients: ["Bacon", "Lettuce", "Tomato", "Mayo", "Toast"], price: 10.5 },
      { name: "Chicken Caesar Wrap", ingredients: ["Grilled chicken", "Romaine", "Parmesan", "Caesar dressing", "Tortilla"], price: 12.0 },
      { name: "Meatball Sub", ingredients: ["Meatballs", "Marinara", "Provolone", "Hoagie roll"], price: 13.0 },
    ],
  },
  breakfast_restaurant: {
    label: "Breakfast",
    items: [
      { name: "Pancakes", ingredients: ["Buttermilk pancakes", "Butter", "Maple syrup"], price: 11.5 },
      { name: "Avocado Toast", ingredients: ["Sourdough", "Avocado", "Chili flakes", "Lemon"], price: 12.5 },
      { name: "Eggs Benedict", ingredients: ["Poached eggs", "English muffin", "Canadian bacon", "Hollandaise"], price: 15.5 },
      { name: "Breakfast Burrito", ingredients: ["Scrambled eggs", "Potato", "Cheese", "Sausage", "Tortilla"], price: 12.0 },
      { name: "French Toast", ingredients: ["Brioche", "Cinnamon", "Maple syrup", "Powdered sugar"], price: 12.5 },
    ],
  },
  brunch_restaurant: {
    label: "Brunch",
    items: [
      { name: "Avocado Toast", ingredients: ["Sourdough", "Avocado", "Chili flakes", "Poached egg"], price: 14.0 },
      { name: "Eggs Benedict", ingredients: ["Poached eggs", "English muffin", "Canadian bacon", "Hollandaise"], price: 16.0 },
      { name: "Pancakes", ingredients: ["Buttermilk pancakes", "Butter", "Maple syrup"], price: 12.5 },
      { name: "Breakfast Burrito", ingredients: ["Scrambled eggs", "Potato", "Cheese", "Tortilla"], price: 13.0 },
    ],
  },
  cafe: {
    label: "Cafe",
    items: [
      { name: "Latte", ingredients: ["Espresso", "Steamed milk"], price: 5.25 },
      { name: "Cappuccino", ingredients: ["Espresso", "Steamed milk", "Milk foam"], price: 5.0 },
      { name: "Cold Brew", ingredients: ["Cold brew coffee", "Ice"], price: 5.5 },
      { name: "Croissant", ingredients: ["Butter", "Flour", "Yeast"], price: 4.25 },
      { name: "Avocado Toast", ingredients: ["Sourdough", "Avocado", "Chili flakes"], price: 11.0 },
    ],
  },
  coffee_shop: {
    label: "Coffee",
    items: [
      { name: "Latte", ingredients: ["Espresso", "Steamed milk"], price: 5.25 },
      { name: "Cappuccino", ingredients: ["Espresso", "Steamed milk", "Milk foam"], price: 5.0 },
      { name: "Cold Brew", ingredients: ["Cold brew coffee", "Ice"], price: 5.5 },
      { name: "Caramel Macchiato", ingredients: ["Espresso", "Steamed milk", "Vanilla syrup", "Caramel drizzle"], price: 6.25 },
      { name: "Croissant", ingredients: ["Butter", "Flour", "Yeast"], price: 4.25 },
    ],
  },
  bakery: {
    label: "Bakery",
    items: [
      { name: "Croissant", ingredients: ["Butter", "Flour", "Yeast"], price: 4.25 },
      { name: "Bagel", ingredients: ["Flour", "Cream cheese"], price: 4.0 },
      { name: "Blueberry Muffin", ingredients: ["Blueberries", "Flour", "Butter", "Sugar"], price: 4.5 },
      { name: "Cinnamon Roll", ingredients: ["Cinnamon", "Butter", "Cream cheese icing"], price: 5.5 },
      { name: "Sourdough Loaf", ingredients: ["Sourdough starter", "Flour", "Salt"], price: 8.0 },
    ],
  },
  ice_cream_shop: {
    label: "Ice Cream",
    items: [
      { name: "Vanilla Sundae", ingredients: ["Vanilla ice cream", "Hot fudge", "Whipped cream", "Cherry"], price: 7.5 },
      { name: "Chocolate Milkshake", ingredients: ["Chocolate ice cream", "Milk"], price: 6.5 },
      { name: "Waffle Cone", ingredients: ["Ice cream", "Waffle cone"], price: 6.0 },
      { name: "Banana Split", ingredients: ["Banana", "Three ice cream scoops", "Hot fudge", "Whipped cream"], price: 9.5 },
    ],
  },
  dessert_shop: {
    label: "Dessert",
    items: [
      { name: "Chocolate Cake", ingredients: ["Chocolate sponge", "Ganache", "Buttercream"], price: 8.5 },
      { name: "Cheesecake", ingredients: ["Cream cheese", "Graham crust", "Berry compote"], price: 8.5 },
      { name: "Brownie Sundae", ingredients: ["Brownie", "Vanilla ice cream", "Hot fudge"], price: 9.0 },
      { name: "Churros", ingredients: ["Fried dough", "Cinnamon sugar", "Chocolate sauce"], price: 7.0 },
    ],
  },
  vegan_restaurant: {
    label: "Vegan",
    items: [
      { name: "Buddha Bowl", ingredients: ["Quinoa", "Roasted vegetables", "Chickpeas", "Tahini"], price: 15.5 },
      { name: "Vegan Burger", ingredients: ["Plant-based patty", "Vegan cheese", "Lettuce", "Tomato", "Bun"], price: 16.0 },
      { name: "Tofu Stir Fry", ingredients: ["Tofu", "Mixed vegetables", "Soy-ginger sauce", "Rice"], price: 15.0 },
      { name: "Vegan Tacos", ingredients: ["Jackfruit", "Corn tortillas", "Cabbage slaw", "Avocado"], price: 14.0 },
    ],
  },
  vegetarian_restaurant: {
    label: "Vegetarian",
    items: [
      { name: "Veggie Burger", ingredients: ["Black bean patty", "Cheddar", "Lettuce", "Tomato", "Bun"], price: 14.5 },
      { name: "Buddha Bowl", ingredients: ["Quinoa", "Roasted vegetables", "Chickpeas", "Tahini"], price: 15.0 },
      { name: "Paneer Tikka", ingredients: ["Paneer", "Bell peppers", "Onion", "Tikka spices"], price: 15.5 },
      { name: "Vegetable Curry", ingredients: ["Mixed vegetables", "Coconut curry", "Basmati rice"], price: 14.5 },
    ],
  },
  spanish_restaurant: {
    label: "Spanish",
    items: [
      { name: "Paella", ingredients: ["Bomba rice", "Saffron", "Shrimp", "Mussels", "Chorizo"], price: 26.0 },
      { name: "Patatas Bravas", ingredients: ["Fried potatoes", "Brava sauce", "Aioli"], price: 9.5 },
      { name: "Jamón Croquetas", ingredients: ["Serrano ham", "Béchamel", "Breadcrumbs"], price: 11.0 },
      { name: "Tortilla Española", ingredients: ["Eggs", "Potato", "Onion", "Olive oil"], price: 10.0 },
    ],
  },
  french_restaurant: {
    label: "French",
    items: [
      { name: "Coq au Vin", ingredients: ["Chicken", "Red wine", "Mushrooms", "Pearl onions", "Bacon"], price: 28.0 },
      { name: "French Onion Soup", ingredients: ["Caramelized onions", "Beef broth", "Gruyère", "Baguette"], price: 12.0 },
      { name: "Steak Frites", ingredients: ["Steak", "Fries", "Herb butter"], price: 32.0 },
      { name: "Croque Monsieur", ingredients: ["Ham", "Gruyère", "Béchamel", "Toasted bread"], price: 16.0 },
    ],
  },
  brazilian_restaurant: {
    label: "Brazilian",
    items: [
      { name: "Picanha Steak", ingredients: ["Top sirloin cap", "Sea salt", "Chimichurri"], price: 29.0 },
      { name: "Feijoada", ingredients: ["Black beans", "Pork", "Sausage", "Rice", "Orange"], price: 22.0 },
      { name: "Coxinha", ingredients: ["Shredded chicken", "Dough", "Breadcrumbs"], price: 7.0 },
      { name: "Pão de Queijo", ingredients: ["Tapioca flour", "Cheese", "Eggs"], price: 6.0 },
    ],
  },
  turkish_restaurant: {
    label: "Turkish",
    items: [
      { name: "Chicken Doner", ingredients: ["Chicken", "Flatbread", "Garlic sauce", "Tomato", "Onion"], price: 14.5 },
      { name: "Adana Kebab", ingredients: ["Ground lamb", "Chili", "Bulgur", "Grilled vegetables"], price: 19.0 },
      { name: "Baklava", ingredients: ["Phyllo", "Pistachio", "Honey syrup"], price: 7.5 },
      { name: "Lahmacun", ingredients: ["Thin dough", "Minced lamb", "Tomato", "Parsley"], price: 11.0 },
    ],
  },
  pub: {
    label: "Pub",
    items: [
      { name: "Fish and Chips", ingredients: ["Battered cod", "Fries", "Tartar sauce", "Malt vinegar"], price: 18.0 },
      { name: "Cheeseburger", ingredients: ["Beef patty", "Cheddar", "Lettuce", "Tomato", "Bun"], price: 15.0 },
      { name: "Loaded Nachos", ingredients: ["Tortilla chips", "Cheese sauce", "Jalapeños", "Sour cream"], price: 13.5 },
      { name: "Buffalo Wings", ingredients: ["Chicken wings", "Buffalo sauce", "Blue cheese dip", "Celery"], price: 15.0 },
    ],
  },
};

const GENERIC: CuisineEntry = {
  label: "Restaurant",
  items: [
    { name: "Chef's Special", ingredients: ["Chef's selection"], price: 18.0 },
    { name: "House Favorite", ingredients: ["House selection"], price: 16.0 },
    { name: "Grilled Chicken Plate", ingredients: ["Grilled chicken", "Seasonal vegetables", "Rice"], price: 17.0 },
    { name: "Soup of the Day", ingredients: ["Daily soup", "Bread"], price: 8.5 },
    { name: "House Salad", ingredients: ["Mixed greens", "Tomato", "Cucumber", "Vinaigrette"], price: 10.0 },
  ],
};

/** Resolve a Google Places `types` array to a cuisine label + common items.
 * Always returns something (falls back to a generic list) so the dropdown
 * has content even for cuisines we haven't curated yet. */
export function resolveCuisineMenu(types: string[]): {
  cuisineType: string;
  label: string;
  items: MenuItem[];
} {
  for (const type of types) {
    const entry = CUISINE_MENUS[type];
    if (entry) {
      return { cuisineType: type, label: entry.label, items: entry.items };
    }
  }
  return { cuisineType: "restaurant", label: GENERIC.label, items: GENERIC.items };
}
