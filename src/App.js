import {useEffect, useState} from 'react'
import './App.css'

const apiStatusConstants = {
  INITIAL: 'INITIAL',
  LOADING: 'LOADING',
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
}

const App = () => {
  const [menuList, setMenuList] = useState([])
  const [activeCategory, setActiveCategory] = useState('')
  const [dishCount, setDishCount] = useState({})
  const [cartCount, setCartCount] = useState(0)
  const [restaurantName, setRestaurantName] = useState('')
  const [apiStatus, setApiStatus] = useState(apiStatusConstants.INITIAL)

  useEffect(() => {
    const fetchMenuData = async () => {
      setApiStatus(apiStatusConstants.LOADING)
      try {
        const response = await fetch(
          'https://apis2.ccbp.in/restaurant-app/restaurant-menu-list-details',
        )

        if (response.ok) {
          const data = await response.json()
          const restaurant = data[0]
          setRestaurantName(restaurant.restaurant_name)
          setMenuList(restaurant.table_menu_list)
          setActiveCategory(restaurant.table_menu_list[0].menu_category)
          setApiStatus(apiStatusConstants.SUCCESS)
        } else {
          setApiStatus(apiStatusConstants.FAILURE)
        }
      } catch {
        setApiStatus(apiStatusConstants.FAILURE)
      }
    }

    fetchMenuData()
  }, [])

  // ✅ Helper function to compute total quantity
  const getTotalCount = updatedDishCount =>
    Object.values(updatedDishCount).reduce((a, b) => a + b, 0)

  // ✅ Increment dish quantity
  const increaseCount = dishId => {
    setDishCount(prev => {
      const updated = {...prev, [dishId]: (prev[dishId] || 0) + 1}
      setCartCount(getTotalCount(updated))
      return updated
    })
  }

  // ✅ Decrement dish quantity
  const decreaseCount = dishId => {
    setDishCount(prev => {
      const current = prev[dishId] || 0
      if (current === 0) return prev
      const updated = {...prev, [dishId]: current - 1}
      setCartCount(getTotalCount(updated))
      return updated
    })
  }

  const renderLoadingView = () => (
    <div className="loader-container">
      <p>🍽️ Fetching delicious dishes...</p>
    </div>
  )

  const renderFailureView = () => (
    <div className="error-view">
      <p>⚠️ Oops! Something went wrong while fetching the menu.</p>
      <button type="button" onClick={() => window.location.reload()}>
        Retry
      </button>
    </div>
  )

  const renderSuccessView = () => (
    <div>
      {/* Header */}
      <header>
        <h1>{restaurantName}</h1>
        <p>My Orders ({cartCount})</p>
      </header>

      {/* Category Buttons */}
      <div>
        {menuList.map(each => (
          <button
            key={each.menu_category_id}
            onClick={() => setActiveCategory(each.menu_category)}
            type="button"
          >
            {each.menu_category}
          </button>
        ))}
      </div>

      {/* Dishes for Active Category */}
      <div>
        {menuList
          .filter(each => each.menu_category === activeCategory)
          .map(category =>
            category.category_dishes.map(dish => (
              <div key={dish.dish_id}>
                <h1>{dish.dish_name}</h1>
                <p>
                  {dish.dish_currency} {dish.dish_price}
                </p>
                <p>{dish.dish_description}</p>
                <p>{dish.dish_calories} calories</p>
                <img
                  src={dish.dish_image}
                  alt={dish.dish_name}
                  width="150"
                  height="100"
                />

                {dish.addonCat && dish.addonCat.length > 0 && (
                  <p>Customizations available</p>
                )}
                {!dish.dish_Availability && <p>Not available</p>}

                <p>{dishCount[dish.dish_id] || 0}</p>

                {dish.dish_Availability && (
                  <div>
                    <button
                      type="button"
                      onClick={() => decreaseCount(dish.dish_id)}
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => increaseCount(dish.dish_id)}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            )),
          )}
      </div>
    </div>
  )

  const renderAllViews = () => {
    switch (apiStatus) {
      case apiStatusConstants.LOADING:
        return renderLoadingView()
      case apiStatusConstants.SUCCESS:
        return renderSuccessView()
      case apiStatusConstants.FAILURE:
        return renderFailureView()
      default:
        return null
    }
  }

  return <div>{renderAllViews()}</div>
}

export default App
