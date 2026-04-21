import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const personalInfoSchema = z.object({
  user_name: z.string().trim().min(1, "请输入姓名").max(50, "姓名过长"),
  user_gender: z.string().min(1, "请选择性别"),
  user_email: z.string().trim().email("邮箱格式不正确").max(100),
  user_phone: z.string().trim().min(6, "请输入有效手机号").max(20),
});

export type PersonalInfo = z.infer<typeof personalInfoSchema>;

interface Props {
  defaultValues?: Partial<PersonalInfo>;
  onSubmit: (data: PersonalInfo) => void;
}

const PersonalInfoStep = ({ defaultValues, onSubmit }: Props) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PersonalInfo>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: { user_gender: "", ...defaultValues },
  });
  const gender = watch("user_gender");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="user_name">姓名 *</Label>
        <Input id="user_name" placeholder="请输入姓名" {...register("user_name")} />
        {errors.user_name && <p className="text-sm text-destructive">{errors.user_name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>性别 *</Label>
        <RadioGroup value={gender} onValueChange={(v) => setValue("user_gender", v, { shouldValidate: true })} className="flex gap-4">
          {["女", "男", "其他", "不愿透露"].map((g) => (
            <div key={g} className="flex items-center gap-2">
              <RadioGroupItem value={g} id={`g-${g}`} />
              <Label htmlFor={`g-${g}`} className="font-normal cursor-pointer">{g}</Label>
            </div>
          ))}
        </RadioGroup>
        {errors.user_gender && <p className="text-sm text-destructive">{errors.user_gender.message}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="user_email">邮箱 *</Label>
          <Input id="user_email" type="email" placeholder="you@example.com" {...register("user_email")} />
          {errors.user_email && <p className="text-sm text-destructive">{errors.user_email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="user_phone">手机号 *</Label>
          <Input id="user_phone" type="tel" placeholder="请输入手机号" {...register("user_phone")} />
          {errors.user_phone && <p className="text-sm text-destructive">{errors.user_phone.message}</p>}
        </div>
      </div>

      <Button type="submit" className="w-full rounded-full" size="lg">
        下一步：填写问卷
      </Button>
    </form>
  );
};

export default PersonalInfoStep;
