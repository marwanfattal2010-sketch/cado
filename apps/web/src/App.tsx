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
import { Checkout } from "./pages/Checkout";
import { OrderConfirmed } from "./pages/OrderConfirmed";
import { Search } from "./pages/Search";
import { Orders } from "./pages/Orders";
import { Account } from "./pages/Account";
import { Wishlist } from "./pages/Wishlist";
import { Settings } from "./pages/Settings";
import { HelpCenter } from "./pages/HelpCenter";
import { Language } from "./pages/Language";
import { GiftFinder } from "./pages/GiftFinder";
import { Occasions } from "./pages/Occasions";
import { GiftCards } from "./pages/GiftCards";
import { GiftCardSend } from "./pages/GiftCardSend";
import { GiftCardRedeem } from "./pages/GiftCardRedeem";
import { AdminMoney } from "./pages/AdminMoney";
import { About } from "./pages/About";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { TermsOfService } from "./pages/TermsOfService";
import { DeliveryReturns } from "./pages/DeliveryReturns";
import { Partners } from "./pages/Partners";
import { Shop } from "./pages/Shop";

export default function App() {
  return (
    <Routes>
      {/* Outside Layout on purpose. /shop owns its whole viewport: the shell
          is 100dvh with each tab panel scrolling independently, which cannot
          work inside Layout's single window scroll — and Layout's page
          transition applies a transform, which would unpin the bottom nav
          and the sheet backdrop inside the pager. */}
      <Route path="shop" element={<Shop />} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="search" element={<Search />} />
        <Route path="orders" element={<Orders />} />
        <Route path="account" element={<Account />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route path="settings" element={<Settings />} />
        <Route path="help" element={<HelpCenter />} />
        <Route path="language" element={<Language />} />
        <Route path="browse" element={<Browse />} />
        <Route path="category/:slug" element={<Category />} />
        <Route path="store/:id" element={<Store />} />
        <Route path="product/:id" element={<Product />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="order-confirmed/:id" element={<OrderConfirmed />} />
        <Route path="gift-finder" element={<GiftFinder />} />
        <Route path="occasions" element={<Occasions />} />
        <Route path="gift-cards" element={<GiftCards />} />
        <Route path="gift-cards/send" element={<GiftCardSend />} />
        <Route path="gift-cards/redeem" element={<GiftCardRedeem />} />
        <Route path="admin/money" element={<AdminMoney />} />
        <Route path="about" element={<About />} />
        <Route path="privacy" element={<PrivacyPolicy />} />
        <Route path="terms" element={<TermsOfService />} />
        <Route path="delivery-returns" element={<DeliveryReturns />} />
        <Route path="partners" element={<Partners />} />
      </Route>
    </Routes>
  );
}
