-- Give every new account three starter meals so the ordering screen is
-- immediately usable instead of showing an empty state. Photos reuse
-- already-fetched Unsplash images (with their original attribution) so no
-- API call is needed at signup time.
create or replace function public.seed_default_meals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.saved_meals (
    user_id, restaurant, name, main_ingredients, price, cuisine_type,
    image_url, image_photographer_name, image_photographer_url, image_unsplash_url
  )
  values
    (
      new.id, 'Tony''s Pizza', 'Cheese Pizza',
      array['Mozzarella', 'Tomato sauce', 'Fresh basil'], 12.50, 'pizza_restaurant',
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDIzNTI3fDB8MXxzZWFyY2h8MXx8Q2hlZXNlJTIwcGl6emElMjBmb29kJTIwZGlzaHxlbnwxfDB8fHwxNzg2MzIzMTE2fDA&ixlib=rb-4.1.0&q=80&w=1080',
      'Ivan Torres',
      'https://unsplash.com/@iavnt?utm_source=swipeorder&utm_medium=referral',
      'https://unsplash.com/?utm_source=swipeorder&utm_medium=referral'
    ),
    (
      new.id, 'Chick-fil-A', '8-Count Nuggets Meal',
      array['Chicken nuggets', 'Waffle fries', 'Chick-fil-A sauce'], 9.25, 'fast_food_restaurant',
      'https://images.unsplash.com/photo-1619881590738-a111d176d906?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDIzNTI3fDB8MXxzZWFyY2h8MXx8OC1Db3VudCUyME51Z2dldHMlMjBNZWFsJTIwZm9vZCUyMGRpc2h8ZW58MXwwfHx8MTc4NjMyMTI5MHww&ixlib=rb-4.1.0&q=80&w=1080',
      'Brett Jordan',
      'https://unsplash.com/@brett_jordan?utm_source=swipeorder&utm_medium=referral',
      'https://unsplash.com/?utm_source=swipeorder&utm_medium=referral'
    ),
    (
      new.id, 'Burger King', 'Cheeseburger',
      array['Beef patty', 'American cheese', 'Pickles', 'Ketchup', 'Bun'], 7.50, 'fast_food_restaurant',
      'https://images.unsplash.com/photo-1561758033-d89a9ad46330?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDIzNTI3fDB8MXxzZWFyY2h8MXx8Q2hlZXNlYnVyZ2VyJTIwZm9vZCUyMGRpc2h8ZW58MXwwfHx8MTc4NjMyNjk4Mnww&ixlib=rb-4.1.0&q=80&w=1080',
      'Jonathan Borba',
      'https://unsplash.com/@jonathanborba?utm_source=swipeorder&utm_medium=referral',
      'https://unsplash.com/?utm_source=swipeorder&utm_medium=referral'
    );

  return new;
exception
  when others then
    -- Seeding is a convenience, never a reason to fail account creation.
    return new;
end;
$$;

drop trigger if exists on_auth_user_created_seed_meals on auth.users;

create trigger on_auth_user_created_seed_meals
  after insert on auth.users
  for each row execute function public.seed_default_meals();
