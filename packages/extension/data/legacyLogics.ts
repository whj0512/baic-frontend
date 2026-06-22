export interface LegacyLogicDefinition {
  name: string
  name_as: string
  type: 'logic'
  doc?: string
}

export interface LegacySignalTypeDefinition {
  name: string
  type: 'type'
  doc?: string
  value_string_mapping?: Array<{ name: string; value: string }>
}

export interface LegacyActionDatabaseData {
  logics: LegacyLogicDefinition[]
  types: LegacySignalTypeDefinition[]
}

export const legacyLogics = [
  {
    "name": "ceil",
    "name_as": "ceil(number)",
    "type": "logic",
    "doc": "Return the ceiling of x as an Integral.\n\nThis is the smallest integer >= x."
  },
  {
    "name": "comb",
    "name_as": "comb(number, number)",
    "type": "logic",
    "doc": "Number of ways to choose k items from n items without repetition and without order.\n\nEvaluates to n! / (k! * (n - k)!) when k <= n and evaluates\nto zero when k > n.\n\nAlso called the binomial coefficient because it is equivalent\nto the coefficient of k-th term in polynomial expansion of the\nexpression (1 + x)**n.\n\nRaises TypeError if either of the arguments are not integers.\nRaises ValueError if either of the arguments are negative."
  },
  {
    "name": "copysign",
    "name_as": "copysign(number, number)",
    "type": "logic",
    "doc": "Return a float with the magnitude (absolute value) of x but the sign of y.\n\nOn platforms that support signed zeros, copysign(1.0, -0.0)\nreturns -1.0."
  },
  {
    "name": "fabs",
    "name_as": "fabs(number)",
    "type": "logic",
    "doc": "Return the absolute value of the float x."
  },
  {
    "name": "factorial",
    "name_as": "factorial(number)",
    "type": "logic",
    "doc": "Find x!.\n\nRaise a ValueError if x is negative or non-integral."
  },
  {
    "name": "floor",
    "name_as": "floor(number)",
    "type": "logic",
    "doc": "Return the floor of x as an Integral.\n\nThis is the largest integer <= x."
  },
  {
    "name": "fmod",
    "name_as": "fmod(number, number)",
    "type": "logic",
    "doc": "Return fmod(x, y), according to platform C.\n\nx % y may differ."
  },
  {
    "name": "frexp",
    "name_as": "frexp(number)",
    "type": "logic",
    "doc": "Return the mantissa and exponent of x, as pair (m, e).\n\nm is a float and e is an int, such that x = m * 2.**e.\nIf x is 0, m and e are both 0.  Else 0.5 <= abs(m) < 1.0."
  },
  {
    "name": "isfinite",
    "name_as": "isfinite(number)",
    "type": "logic",
    "doc": "Return True if x is neither an infinity nor a NaN, and False otherwise."
  },
  {
    "name": "isinf",
    "name_as": "isinf(number)",
    "type": "logic",
    "doc": "Return True if x is a positive or negative infinity, and False otherwise."
  },
  {
    "name": "isqrt",
    "name_as": "isqrt(number)",
    "type": "logic",
    "doc": "Return the integer part of the square root of the input."
  },
  {
    "name": "ldexp",
    "name_as": "ldexp(number, number)",
    "type": "logic",
    "doc": "Return x * (2**i).\n\nThis is essentially the inverse of frexp()."
  },
  {
    "name": "modf",
    "name_as": "modf(number)",
    "type": "logic",
    "doc": "Return the fractional and integer parts of x.\n\nBoth results carry the sign of x and are floats."
  },
  {
    "name": "perm",
    "name_as": "perm(number, number)",
    "type": "logic",
    "doc": "Number of ways to choose k items from n items without repetition and with order.\n\nEvaluates to n! / (n - k)! when k <= n and evaluates\nto zero when k > n.\n\nIf k is not specified or is None, then k defaults to n\nand the function returns n!.\n\nRaises TypeError if either of the arguments are not integers.\nRaises ValueError if either of the arguments are negative."
  },
  {
    "name": "remainder",
    "name_as": "remainder(number, number)",
    "type": "logic",
    "doc": "Difference between x and the closest integer multiple of y.\n\nReturn x - n*y where n*y is the closest integer multiple of y.\nIn the case where x is exactly halfway between two multiples of\ny, the nearest even value of n is used. The result is always exact."
  },
  {
    "name": "trunc",
    "name_as": "trunc(number)",
    "type": "logic",
    "doc": "Truncates the Real x to the nearest Integral toward 0.\n\nUses the __trunc__ magic method."
  },
  {
    "name": "exp",
    "name_as": "exp(number)",
    "type": "logic",
    "doc": "Return e raised to the power of x."
  },
  {
    "name": "expm1",
    "name_as": "expm1(number)",
    "type": "logic",
    "doc": "Return exp(x)-1.\n\nThis function avoids the loss of precision involved in the direct evaluation of exp(x)-1 for small x."
  },
  {
    "name": "log",
    "name_as": "log()",
    "type": "logic",
    "doc": "log(x, [base=math.e])\nReturn the logarithm of x to the given base.\n\nIf the base not specified, returns the natural logarithm (base e) of x."
  },
  {
    "name": "log1p",
    "name_as": "log1p(number)",
    "type": "logic",
    "doc": "Return the natural logarithm of 1+x (base e).\n\nThe result is computed in a way which is accurate for x near zero."
  },
  {
    "name": "log2",
    "name_as": "log2(number)",
    "type": "logic",
    "doc": "Return the base 2 logarithm of x."
  },
  {
    "name": "log10",
    "name_as": "log10(number)",
    "type": "logic",
    "doc": "Return the base 10 logarithm of x."
  },
  {
    "name": "pow",
    "name_as": "pow(number, number)",
    "type": "logic",
    "doc": "Return x**y (x to the power of y)."
  },
  {
    "name": "sqrt",
    "name_as": "sqrt(number)",
    "type": "logic",
    "doc": "Return the square root of x."
  },
  {
    "name": "acos",
    "name_as": "acos(number)",
    "type": "logic",
    "doc": "Return the arc cosine (measured in radians) of x."
  },
  {
    "name": "asin",
    "name_as": "asin(number)",
    "type": "logic",
    "doc": "Return the arc sine (measured in radians) of x."
  },
  {
    "name": "atan",
    "name_as": "atan(number)",
    "type": "logic",
    "doc": "Return the arc tangent (measured in radians) of x."
  },
  {
    "name": "atan2",
    "name_as": "atan2(number, number)",
    "type": "logic",
    "doc": "Return the arc tangent (measured in radians) of y/x.\n\nUnlike atan(y/x), the signs of both x and y are considered."
  },
  {
    "name": "cos",
    "name_as": "cos(number)",
    "type": "logic",
    "doc": "Return the cosine of x (measured in radians)."
  },
  {
    "name": "sin",
    "name_as": "sin(number)",
    "type": "logic",
    "doc": "Return the sine of x (measured in radians)."
  },
  {
    "name": "tan",
    "name_as": "tan(number)",
    "type": "logic",
    "doc": "Return the tangent of x (measured in radians)."
  },
  {
    "name": "degrees",
    "name_as": "degrees(number)",
    "type": "logic",
    "doc": "Convert angle x from radians to degrees."
  },
  {
    "name": "radians",
    "name_as": "radians(number)",
    "type": "logic",
    "doc": "Convert angle x from degrees to radians."
  },
  {
    "name": "acosh",
    "name_as": "acosh(number)",
    "type": "logic",
    "doc": "Return the inverse hyperbolic cosine of x."
  },
  {
    "name": "asinh",
    "name_as": "asinh(number)",
    "type": "logic",
    "doc": "Return the inverse hyperbolic sine of x."
  },
  {
    "name": "atanh",
    "name_as": "atanh(number)",
    "type": "logic",
    "doc": "Return the inverse hyperbolic tangent of x."
  },
  {
    "name": "cosh",
    "name_as": "cosh(number)",
    "type": "logic",
    "doc": "Return the hyperbolic cosine of x."
  },
  {
    "name": "sinh",
    "name_as": "sinh(number)",
    "type": "logic",
    "doc": "Return the hyperbolic sine of x."
  },
  {
    "name": "tanh",
    "name_as": "tanh(number)",
    "type": "logic",
    "doc": "Return the hyperbolic tangent of x."
  },
  {
    "name": "erf",
    "name_as": "erf(number)",
    "type": "logic",
    "doc": "Error function at x."
  },
  {
    "name": "erfc",
    "name_as": "erfc(number)",
    "type": "logic",
    "doc": "Complementary error function at x."
  },
  {
    "name": "gamma",
    "name_as": "gamma(number)",
    "type": "logic",
    "doc": "Gamma function at x."
  },
  {
    "name": "lgamma",
    "name_as": "lgamma(number)",
    "type": "logic",
    "doc": "Natural logarithm of absolute value of Gamma function at x."
  },
  {
    "name": "max",
    "name_as": "max()",
    "type": "logic",
    "doc": "max(iterable, *[, default=obj, key=func]) -> value\nmax(arg1, arg2, *args, *[, key=func]) -> value\n\nWith a single iterable argument, return its biggest item. The\ndefault keyword-only argument specifies an object to return if\nthe provided iterable is empty.\nWith two or more arguments, return the largest argument."
  },
  {
    "name": "min",
    "name_as": "min()",
    "type": "logic",
    "doc": "min(iterable, *[, default=obj, key=func]) -> value\nmin(arg1, arg2, *args, *[, key=func]) -> value\n\nWith a single iterable argument, return its smallest item. The\ndefault keyword-only argument specifies an object to return if\nthe provided iterable is empty.\nWith two or more arguments, return the smallest argument."
  },
  {
    "name": "ValueInterval",
    "name_as": "ValueInterval()",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "边界点",
    "name_as": "边界点('[0,10] | (15,20) | {30,40,50}', 局部变量)",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "boundary_points",
    "name_as": "boundary_points('[0,10] | (15,20) | {30,40,50}', 局部变量)",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "数据集",
    "name_as": "数据集([, ], 局部变量)",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "group",
    "name_as": "group([, ], 局部变量)",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "随机值",
    "name_as": "随机值('[0,10] | (15,20)', 取值个数, 局部变量)",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "random_points",
    "name_as": "random_points('[0,10] | (15,20)', 取值个数, 局部变量)",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "加载",
    "name_as": "加载()",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "load",
    "name_as": "load()",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "save",
    "name_as": "save()",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "保存",
    "name_as": "保存()",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "contain",
    "name_as": "contain(信号名, 预期值)",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "observe",
    "name_as": "observe()",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "观测",
    "name_as": "观测()",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "confirm",
    "name_as": "confirm()",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "确认",
    "name_as": "确认()",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "恢复默认值",
    "name_as": "恢复默认值(signals_restore, exception = [signal_except])",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "restore_default",
    "name_as": "restore_default(signals_restore, exception = [signal_except])",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "恢复特定信号默认值",
    "name_as": "恢复特定信号默认值(signals_to_restore)",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "restore_specific_default",
    "name_as": "restore_specific_default(signals_to_restore)",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "error_tolerance",
    "name_as": "error_tolerance(预期值, 误差)",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "允许误差范围",
    "name_as": "允许误差范围(预期值, 误差)",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "show",
    "name_as": "show()",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "提示",
    "name_as": "提示()",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "speech_send",
    "name_as": "speech_send('请输入语音文本', dict(声道=1, 语调=50, 语速=50, 角色=''))",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "语音播放",
    "name_as": "语音播放('请输入语音文本', dict(声道=1, 语调=50, 语速=50, 角色=''))",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "界面操作",
    "name_as": "界面操作()",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "ui_op",
    "name_as": "ui_op()",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "调用",
    "name_as": "调用()",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "call",
    "name_as": "call()",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "after",
    "name_as": "after(time, sec)",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "before",
    "name_as": "before(time, sec)",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "during",
    "name_as": "during(time1, time2, sec)",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "duration",
    "name_as": "duration(condition, time, sec)",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "sustain",
    "name_as": "sustain(time, sec)",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "wait",
    "name_as": "wait(time, sec)",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "debug",
    "name_as": "debug()",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "时间检查点",
    "name_as": "时间检查点(time, sec)",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "checkpoint",
    "name_as": "checkpoint(time, sec)",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "获取信号当前值",
    "name_as": "获取信号当前值('信号')",
    "type": "logic",
    "doc": ""
  },
  {
    "name": "get_cur_sig_val",
    "name_as": "get_cur_sig_val('信号')",
    "type": "logic",
    "doc": ""
  }
] satisfies LegacyLogicDefinition[]

export const legacyTypes = [] satisfies LegacySignalTypeDefinition[]

export const getLegacyActionDatabaseData = (): LegacyActionDatabaseData => ({
  logics: legacyLogics,
  types: legacyTypes,
})
