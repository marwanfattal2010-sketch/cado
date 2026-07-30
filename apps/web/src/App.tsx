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
import { GiftFinder } from "./pages/GiftFinder";
import { GiftFinderResults } from "./pages/GiftFinderResults";
import { GiftCards } from "./pages/GiftCards";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="browse" element={<Browse />} />
        <Route path="category/:slug" element={<Category />} />
        <Route path="store/:id" element={<Store />} />
        <Route path="product/:id" element={<Product />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="cart" element={<Cart />} />
        <Route path="gift-finder" element={<GiftFinder />} />
        <Route path="gift-finder/results" element={<GiftFinderResults />} />
        <Route path="gift-cards" element={<GiftCards />} />
      </Route>
    </Routes>
  );
}
