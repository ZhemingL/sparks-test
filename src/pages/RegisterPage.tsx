import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight } from "lucide-react";

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  discount_price: number | null;
  discount_enabled: boolean;
  status: string | null;
}

const RegisterPage = () => {
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name, description, price, discount_price, discount_enabled, status")
        .eq("is_active", true)
        .order("sort_order");
      if (data) setServices(data as Service[]);
    })();
  }, []);

  return (
    <Layout>
      <section className="bg-secondary/30 py-20">
        <div className="container text-center">
          <h1 className="font-display text-4xl font-bold md:text-5xl">选择报名课程</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            选择你感兴趣的课程，完成简短的入组评估即可报名。
          </p>
          <div className="mt-4 mx-auto h-1 w-16 rounded-full bg-primary" />
        </div>
      </section>

      <section className="py-16">
        <div className="container">
          <div className="grid gap-4 md:grid-cols-2">
            {services.map((s) => (
              <Card key={s.id} className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    {s.name}
                    {s.discount_enabled && s.discount_price != null ? (
                      <span className="flex items-baseline gap-1.5">
                        <span className="text-sm text-muted-foreground line-through">
                          {s.price === 0 ? "免费" : `¥${Number(s.price).toLocaleString()}`}
                        </span>
                        <span className="text-base font-bold text-primary">
                          {s.discount_price === 0 ? "免费" : `¥${Number(s.discount_price).toLocaleString()}`}
                        </span>
                      </span>
                    ) : (
                      <span className="text-base font-bold text-primary">
                        {s.price === 0 ? "免费" : `¥${Number(s.price).toLocaleString()}`}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-end justify-between gap-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>
                  <Link to={`/register/${s.id}`}>
                    <Button size="sm" className="rounded-full whitespace-nowrap">
                      报名 <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default RegisterPage;
