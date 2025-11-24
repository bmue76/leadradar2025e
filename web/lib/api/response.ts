import { NextResponse } from 'next/server';

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiError = {
  success: false;
  error: {
    message: string;
    code?: string;
  };
};

export function ok<T>(data: T, status = 200) {
  const body: ApiSuccess<T> = {
    success: true,
    data,
  };

  return NextResponse.json(body, { status });
}

export function apiError(message: string, status = 500, code?: string) {
  const body: ApiError = {
    success: false,
    error: { message, code },
  };

  return NextResponse.json(body, { status });
}
