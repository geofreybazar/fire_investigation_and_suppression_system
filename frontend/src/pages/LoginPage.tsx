import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import logo from "@/assets/logo.svg";
import LoginForm from "@/components/features/login/LoginForm";

const LoginPage = () => {
  return (
    <div className='flex items-center justify-center min-h-screen bg-offwhite'>
      <Card className='w-[500px] shadow-md rounded-2xl border border-gold'>
        <CardHeader className='text-center space-y-2'>
          <div className='flex justify-center mb-2'>
            <img src={logo} alt='GEO + Me Bridal' className='w-60' />
          </div>
          <CardTitle className='text-xl tracking-wide'>
            Fire Investigation and Intelligence System
          </CardTitle>
          <CardDescription className='text-gray-400 text-sm'>
            Login to your account to continue
          </CardDescription>
        </CardHeader>

        <CardContent>
          <LoginForm />
          <p className='text-center text-xs text-gray-500 mt-4'>
            © 2026 Bureau of Fire Protection. All rights reserved.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
