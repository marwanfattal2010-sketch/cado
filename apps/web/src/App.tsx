import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Browse } from "./pages/Browse";
import { Category } from "./pages/Category";
import { Store } from "./pages/Store";
import { Product } from "./pages/Product";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Cart } from "./pages/Cart";
import { Search } from "./pages/Search";
import { Orders } from "./pages/Orders";
import { Account } from "./pages/Account";
import { GiftFinder } from "./pages/GiftFinder";
import { GiftCards } from "./pages/GiftCards";
import { GiftCardSend } from "./pages/GiftCardSend";
import { GiftCardRedeem } from "./pages/GiftCardRedeem";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="search" element={<Search />} />
        <Route path="orders" element={<Orders />} />
        <Route path="account" element={<Account />} />
        <Route path="browse" element={<Browse />} />
        <Route path="category/:slug" element={<Category />} />
        <Route path="store/:id" element={<Store />} />
        <Route path="product/:id" element={<Product />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="cart" element={<Cart />} />
        <Route path="gift-finder" element={<GiftFinder />} />
        <Route path="gift-cards" element={<GiftCards />} />
        <Route path="gift-cards/send" element={<GiftCardSend />} />
        <Route path="gift-cards/redeem" element={<GiftCardRedeem />} />
      </Route>
    </Routes>
  );
}
