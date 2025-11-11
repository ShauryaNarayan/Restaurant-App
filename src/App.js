import React, {
  useState,
  useEffect,
  useMemo,
  createContext,
  useContext,
} from 'react'
import {
  BrowserRouter,
  Switch,
  Route,
  Redirect,
  useHistory,
  withRouter,
} from 'react-router-dom'
import Cookies from 'js-cookie'

/* =========================================================
   CART CONTEXT — REQUIRED FOR TEST CASES
   ========================================================= */
export const CartContext = createContext({
  cartList: [],
  addCartItem: () => {},
  removeAllCartItems: () => {},
  removeCartItem: () => {},
  incrementCartItemQuantity: () => {},
  decrementCartItemQuantity: () => {},
})

const CartProvider = ({children}) => {
  const [cartList, setCartList] = useState([])

  const addCartItem = dish => {
    const qty = dish.__qtyToAdd ?? 1

    setCartList(prev => {
      const exists = prev.find(i => i.dish_id === dish.dish_id)

      if (exists) {
        return prev.map(i =>
          i.dish_id === dish.dish_id ? {...i, quantity: i.quantity + qty} : i,
        )
      }

      return [
        ...prev,
        {
          dish_id: dish.dish_id,
          dish_name: dish.dish_name,
          dish_price: dish.dish_price,
          dish_currency: dish.dish_currency,
          dish_image: dish.dish_image,
          quantity: qty,
        },
      ]
    })
  }

  const removeAllCartItems = () => setCartList([])

  const removeCartItem = id =>
    setCartList(prev => prev.filter(i => i.dish_id !== id))

  const incrementCartItemQuantity = id =>
    setCartList(prev =>
      prev.map(i => (i.dish_id === id ? {...i, quantity: i.quantity + 1} : i)),
    )

  const decrementCartItemQuantity = id =>
    setCartList(prev =>
      prev
        .map(i => (i.dish_id === id ? {...i, quantity: i.quantity - 1} : i))
        .filter(i => i.quantity > 0),
    )

  const value = useMemo(
    () => ({
      cartList,
      addCartItem,
      removeCartItem,
      removeAllCartItems,
      incrementCartItemQuantity,
      decrementCartItemQuantity,
    }),
    [cartList],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

/* =========================================================
   PROTECTED ROUTE 
   ========================================================= */
const ProtectedRoute = ({component: Component, ...rest}) => {
  const token = Cookies.get('jwt_token')

  return (
    <Route
      {...rest}
      render={props =>
        token === undefined ? (
          <Redirect to='/login' />
        ) : (
          <Component {...props} />
        )
      }
    />
  )
}

/* =========================================================
   LOGIN ROUTE
   ========================================================= */
const Login = props => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const submitForm = async e => {
    e.preventDefault()
    const userDetails = {username, password}

    const res = await fetch('https://apis.ccbp.in/login', {
      method: 'POST',
      body: JSON.stringify(userDetails),
    })
    const data = await res.json()

    if (res.ok) {
      Cookies.set('jwt_token', data.jwt_token, {expires: 30})
      props.history.replace('/')
    } else {
      setErrorMsg(data.error_msg)
    }
  }

  if (Cookies.get('jwt_token') !== undefined) {
    return <Redirect to='/' />
  }

  return (
    <div className='login-container'>
      <form onSubmit={submitForm}>
        <label htmlFor='username'>USERNAME</label>
        <input
          id='username'
          type='text'
          value={username}
          onChange={e => setUsername(e.target.value)}
        />

        <label htmlFor='password'>PASSWORD</label>
        <input
          id='password'
          type='password'
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <button type='submit'>Login</button>
        {errorMsg && <p>{errorMsg}</p>}
      </form>
    </div>
  )
}

/* =========================================================
   HEADER COMPONENT
   ========================================================= */
const Header = withRouter(({restaurantName, history}) => {
  const {cartList} = useContext(CartContext)

  const logout = () => {
    Cookies.remove('jwt_token')
    history.replace('/login')
  }

  const goHome = () => history.push('/')
  const goCart = () => history.push('/cart')

  return (
    <header className='header'>
      <h1 onClick={goHome}>{restaurantName}</h1>

      <div>
        <button data-testid='cart' onClick={goCart}>
          Cart ({cartList.length})
        </button>
        <button onClick={logout}>Logout</button>
      </div>
    </header>
  )
})

/* =========================================================
   HOME ROUTE — LOCAL QTY PERSISTENCE FIXED ✅
   ========================================================= */
const Home = () => {
  const [restaurant, setRestaurant] = useState(null)
  const [status, setStatus] = useState('LOADING')
  const [activeCategory, setActiveCategory] = useState('')
  const [localQty, setLocalQty] = useState({}) // ✅ persists on this route
  const {addCartItem} = useContext(CartContext)

  useEffect(() => {
    const getMenu = async () => {
      setStatus('LOADING')
      try {
        const res = await fetch(
          'https://apis2.ccbp.in/restaurant-app/restaurant-menu-list-details',
        )
        const data = await res.json()
        const r = Array.isArray(data) ? data[0] : data

        setRestaurant(r)
        setActiveCategory(r.table_menu_list[0].menu_category)

        // ✅ Initialize all quantities to 0
        const initialQty = {}
        r.table_menu_list.forEach(cat =>
          cat.category_dishes.forEach(d => {
            initialQty[d.dish_id] = 0
          }),
        )
        setLocalQty(initialQty)

        setStatus('SUCCESS')
      } catch {
        setStatus('FAILURE')
      }
    }

    getMenu()
  }, [])

  // ✅ Increase quantity locally
  const incLocal = id => setLocalQty(prev => ({...prev, [id]: prev[id] + 1}))

  // ✅ Decrease quantity locally (never delete)
  const decLocal = id =>
    setLocalQty(prev => ({...prev, [id]: Math.max(0, prev[id] - 1)}))

  // ✅ Add to cart WITHOUT resetting local quantity
  const onAddToCart = dish => {
    const qty = localQty[dish.dish_id]
    if (qty > 0) {
      addCartItem({...dish, __qtyToAdd: qty})
    }
  }

  if (status === 'LOADING') return <p>Loading...</p>
  if (status === 'FAILURE') return <p>Something went wrong</p>

  const activeCat = restaurant.table_menu_list.find(
    c => c.menu_category === activeCategory,
  )

  return (
    <div>
      <Header restaurantName={restaurant.restaurant_name} />

      <div className='categories-container'>
        {restaurant.table_menu_list.map(cat => (
          <button
            key={cat.menu_category_id}
            onClick={() => setActiveCategory(cat.menu_category)}
          >
            {cat.menu_category}
          </button>
        ))}
      </div>

      <ul className='dishes-list'>
        {activeCat.category_dishes.map(dish => {
          const qty = localQty[dish.dish_id]

          return (
            <li key={dish.dish_id} className='dish-card'>
              <h1>{dish.dish_name}</h1>
              <p>
                {dish.dish_currency} {dish.dish_price}
              </p>
              <p>{dish.dish_description}</p>
              <p>{dish.dish_calories} calories</p>

              {dish.addonCat?.length > 0 && <p>Customizations available</p>}
              {!dish.dish_Availability && <p>Not available</p>}

              <p>{qty}</p>

              {dish.dish_Availability && (
                <div className='controls'>
                  <button onClick={() => decLocal(dish.dish_id)}>-</button>
                  <button onClick={() => incLocal(dish.dish_id)}>+</button>

                  {qty > 0 && (
                    <button
                      className='add-btn'
                      onClick={() => onAddToCart(dish)}
                    >
                      ADD TO CART
                    </button>
                  )}
                </div>
              )}

              <img
                src={dish.dish_image}
                alt={dish.dish_name}
                className='dish-img'
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* =========================================================
   CART ROUTE
   ========================================================= */
const Cart = () => {
  const {
    cartList,
    removeAllCartItems,
    removeCartItem,
    incrementCartItemQuantity,
    decrementCartItemQuantity,
  } = useContext(CartContext)

  if (cartList.length === 0) {
    return (
      <div className='cart-empty-view-container'>
        <img
          src='https://assets.ccbp.in/frontend/react-js/nxt-trendz-empty-cart-img.png'
          alt='empty cart'
        />
      </div>
    )
  }

  return (
    <div>
      <Header restaurantName={restaurantName} />

      <button onClick={removeAllCartItems}>Remove All</button>

      <ul className='cart-items-list'>
        {cartList.map(item => (
          <li key={item.dish_id} className='cart-item'>
            <img
              src={item.dish_image}
              alt={item.dish_name}
              className='cart-item-img'
            />

            <h3>{item.dish_name}</h3>
            <p>
              {item.dish_currency}{' '}
              {(item.quantity * item.dish_price).toFixed(2)}
            </p>

            <div className='controls'>
              <button onClick={() => decrementCartItemQuantity(item.dish_id)}>
                -
              </button>
              <p>{item.quantity}</p>

              <button onClick={() => incrementCartItemQuantity(item.dish_id)}>
                +
              </button>

              <button onClick={() => removeCartItem(item.dish_id)}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* =========================================================
   APP (ROUTER)
   ========================================================= */
const App = () => (
  <BrowserRouter>
    <CartProvider>
      <Switch>
        <Route exact path='/login' component={withRouter(Login)} />
        <ProtectedRoute exact path='/' component={Home} />
        <ProtectedRoute exact path='/cart' component={Cart} />
        <Redirect to='/login' />
      </Switch>
    </CartProvider>
  </BrowserRouter>
)

export default App
