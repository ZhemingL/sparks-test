import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t bg-secondary/50">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 10C30 10 15 25 15 45C15 55 20 63 28 68L25 85C25 88 28 90 30 88L42 78C44 79 47 79 50 79C70 79 85 64 85 45C85 25 70 10 50 10Z" stroke="hsl(var(--primary))" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="35" cy="25" r="3" fill="hsl(var(--primary))"/>
                <circle cx="68" cy="20" r="2.5" fill="hsl(var(--primary))"/>
              </svg>
              <div>
                <p className="font-display text-lg font-bold">SPARKS 云拾心火</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              面向中国成人ADHD的心理社会支持项目，<br />
              以CBT为核心框架，助力提升生活质量。
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="mb-4 font-medium">快速导航</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-primary transition-colors">首页</Link></li>
              <li><Link to="/about" className="hover:text-primary transition-colors">关于我们</Link></li>
              <li><Link to="/workshops" className="hover:text-primary transition-colors">工作坊</Link></li>
              <li><Link to="/register" className="hover:text-primary transition-colors">报名</Link></li>
              <li><Link to="/faq" className="hover:text-primary transition-colors">常见问题</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 font-medium">联系我们</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>📧 contact@sparks-adhd.com</p>
              <p>💬 添加微信咨询</p>
              <div className="mt-4 flex h-28 w-28 items-center justify-center rounded-lg border bg-background text-xs text-muted-foreground">
                微信二维码
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} 云拾心火 SPARKS. 保留所有权利.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
