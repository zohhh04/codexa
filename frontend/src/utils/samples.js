export const CPP_SAMPLES = {
  hello: {
    label: 'Hello World',
    code: `#include <iostream>

int main() {
    std::cout << "Hello, Codexa!" << std::endl;
    return 0;
}
`,
  },
  arithmetic: {
    label: 'Arithmetic',
    code: `int main() {
    int a = 10;
    int b = 20;
    int sum = a + b;
    int x = 10 * 5;
    return 0;
}
`,
  },
  loopError: {
    label: 'Loop with error',
    code: `int main() {
    for (int i = 0; i < 5; i++) {
        x = x + 10;
    }
    return 0;
}
`,
  },
  fibonacci: {
    label: 'Fibonacci',
    code: `#include <iostream>

int main() {
    int n = 10;
    int a = 0;
    int b = 1;
    for (int i = 0; i < n; i++) {
        std::cout << a << " ";
        int t = a + b;
        a = b;
        b = t;
    }
    std::cout << std::endl;
    return 0;
}
`,
  },
  factorial: {
    label: 'Factorial',
    code: `#include <iostream>

int main() {
    int n = 6;
    int f = 1;
    for (int i = 2; i <= n; i++) {
        f = f * i;
    }
    std::cout << f << std::endl;
    return 0;
}
`,
  },
  primeCheck: {
    label: 'Prime check',
    code: `#include <iostream>

int main() {
    int n = 29;
    int isPrime = 1;
    if (n <= 1) {
        isPrime = 0;
    }
    for (int i = 2; i * i <= n; i++) {
        if (n % i == 0) {
            isPrime = 0;
        }
    }
    if (isPrime == 1) {
        std::cout << "YES" << std::endl;
    } else {
        std::cout << "NO" << std::endl;
    }
    return 0;
}
`,
  },
  bubbleSort: {
    label: 'Bubble sort',
    code: `#include <iostream>

int main() {
    int a = 8;
    int b = 3;
    int c = 5;
    int t = 0;
    if (a > b) {
        t = a;
        a = b;
        b = t;
    }
    if (b > c) {
        t = b;
        b = c;
        c = t;
    }
    if (a > b) {
        t = a;
        a = b;
        b = t;
    }
    std::cout << a << " " << b << " " << c << std::endl;
    return 0;
}
`,
  },
  functions: {
    label: 'Functions',
    code: `#include <iostream>

int add(int a, int b) {
    return a + b;
}

int main() {
    int s = add(17, 25);
    std::cout << s << std::endl;
    return 0;
}
`,
  },
  largestOfThree: {
    label: 'Largest of three',
    code: `#include <iostream>

int main() {
    int a = 12;
    int b = 27;
    int c = 19;
    int m = a;
    if (b > m) {
        m = b;
    }
    if (c > m) {
        m = c;
    }
    std::cout << m << std::endl;
    return 0;
}
`,
  },
};

export const C_SAMPLES = {
  hello: {
    label: 'Hello World',
    code: `#include <stdio.h>

int main() {
    printf("Hello, Codexa!\\n");
    return 0;
}
`,
  },
  arithmetic: {
    label: 'Arithmetic',
    code: `int main() {
    int a = 10;
    int b = 20;
    int sum = a + b;
    int x = 10 * 5;
    return 0;
}
`,
  },
  loopError: {
    label: 'Loop with error',
    code: `int main() {
    for (int i = 0; i < 5; i++) {
        x = x + 10;
    }
    return 0;
}
`,
  },
  fibonacci: {
    label: 'Fibonacci',
    code: `#include <stdio.h>

int main(void) {
    int n = 10;
    int a = 0;
    int b = 1;
    for (int i = 0; i < n; i++) {
        printf("%d ", a);
        int t = a + b;
        a = b;
        b = t;
    }
    printf("\\n");
    return 0;
}
`,
  },
  factorial: {
    label: 'Factorial',
    code: `#include <stdio.h>

int main(void) {
    int n = 6;
    int f = 1;
    for (int i = 2; i <= n; i++) {
        f = f * i;
    }
    printf("%d\\n", f);
    return 0;
}
`,
  },
  primeCheck: {
    label: 'Prime check',
    code: `#include <stdio.h>

int main(void) {
    int n = 29;
    int isPrime = 1;
    if (n <= 1) {
        isPrime = 0;
    }
    for (int i = 2; i * i <= n; i++) {
        if (n % i == 0) {
            isPrime = 0;
        }
    }
    if (isPrime == 1) {
        printf("YES\\n");
    } else {
        printf("NO\\n");
    }
    return 0;
}
`,
  },
  bubbleSort: {
    label: 'Bubble sort',
    code: `#include <stdio.h>

int main(void) {
    int a = 8;
    int b = 3;
    int c = 5;
    int t = 0;
    if (a > b) {
        t = a;
        a = b;
        b = t;
    }
    if (b > c) {
        t = b;
        b = c;
        c = t;
    }
    if (a > b) {
        t = a;
        a = b;
        b = t;
    }
    printf("%d %d %d\\n", a, b, c);
    return 0;
}
`,
  },
  functions: {
    label: 'Functions',
    code: `#include <stdio.h>

int add(int a, int b) {
    return a + b;
}

int main(void) {
    int s = add(17, 25);
    printf("%d\\n", s);
    return 0;
}
`,
  },
  largestOfThree: {
    label: 'Largest of three',
    code: `#include <stdio.h>

int main(void) {
    int a = 12;
    int b = 27;
    int c = 19;
    int m = a;
    if (b > m) {
        m = b;
    }
    if (c > m) {
        m = c;
    }
    printf("%d\\n", m);
    return 0;
}
`,
  },
};

export const JAVA_SAMPLES = {
  hello: {
    label: 'Hello World',
    code: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Codexa!");
    }
}
`,
  },
  arithmetic: {
    label: 'Arithmetic',
    code: `public class Main {
    public static void main(String[] args) {
        int a = 10;
        int b = 20;
        int sum = a + b;
        System.out.println("sum = " + sum);
    }
}
`,
  },
  loopError: {
    label: 'Loop with error',
    code: `public class Main {
    public static void main(String[] args) {
        int x = 5;
        if (x > 2) {
            x = x + 10;
        }
    }
}
`,
  },
  fibonacci: {
    label: 'Fibonacci',
    code: `public class Main {
    public static void main(String[] args) {
        int n = 10;
        long a = 0;
        long b = 1;
        for (int i = 0; i < n; i++) {
            System.out.print(a + " ");
            long t = a + b;
            a = b;
            b = t;
        }
        System.out.println();
    }
}
`,
  },
  factorial: {
    label: 'Factorial',
    code: `public class Main {
    public static void main(String[] args) {
        int n = 6;
        long f = 1;
        for (int i = 2; i <= n; i++) {
            f = f * i;
        }
        System.out.println(f);
    }
}
`,
  },
  primeCheck: {
    label: 'Prime check',
    code: `public class Main {
    public static void main(String[] args) {
        int n = 29;
        boolean isPrime = n > 1;
        for (int i = 2; i * i <= n; i++) {
            if (n % i == 0) {
                isPrime = false;
            }
        }
        System.out.println(isPrime ? "YES" : "NO");
    }
}
`,
  },
  bubbleSort: {
    label: 'Bubble sort',
    code: `public class Main {
    public static void main(String[] args) {
        int[] a = {5, 2, 8, 1, 9};
        int n = a.length;
        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                if (a[j] > a[j + 1]) {
                    int t = a[j];
                    a[j] = a[j + 1];
                    a[j + 1] = t;
                }
            }
        }
        for (int k = 0; k < n; k++) {
            System.out.print(a[k] + " ");
        }
        System.out.println();
    }
}
`,
  },
  functions: {
    label: 'Functions',
    code: `public class Main {
    static int add(int a, int b) {
        return a + b;
    }

    public static void main(String[] args) {
        int s = add(17, 25);
        System.out.println(s);
    }
}
`,
  },
  largestOfThree: {
    label: 'Largest of three',
    code: `public class Main {
    public static void main(String[] args) {
        int a = 12;
        int b = 27;
        int c = 19;
        int m = Math.max(a, Math.max(b, c));
        System.out.println(m);
    }
}
`,
  },
};

export const PYTHON_SAMPLES = {
  hello: {
    label: 'Hello World',
    code: `def main():
    print("Hello, Codexa!")


if __name__ == "__main__":
    main()
`,
  },
  arithmetic: {
    label: 'Arithmetic',
    code: `def main():
    a = 10
    b = 20
    total = a + b
    x = 10 * 5
    print(f"total = {total}")


if __name__ == "__main__":
    main()
`,
  },
  loopError: {
    label: 'If statement',
    code: `def main():
    x = 5
    if x > 2:
        x = x + 10
    print(x)


if __name__ == "__main__":
    main()
`,
  },
  fibonacci: {
    label: 'Fibonacci',
    code: `def main():
    n = 10
    a, b = 0, 1
    out = []
    for _ in range(n):
        out.append(str(a))
        a, b = b, a + b
    print(" ".join(out))


if __name__ == "__main__":
    main()
`,
  },
  factorial: {
    label: 'Factorial',
    code: `def main():
    n = 6
    f = 1
    for i in range(2, n + 1):
        f *= i
    print(f)


if __name__ == "__main__":
    main()
`,
  },
  primeCheck: {
    label: 'Prime check',
    code: `def main():
    n = 29
    is_prime = n > 1
    i = 2
    while i * i <= n:
        if n % i == 0:
            is_prime = False
        i += 1
    print("YES" if is_prime else "NO")


if __name__ == "__main__":
    main()
`,
  },
  bubbleSort: {
    label: 'Bubble sort',
    code: `def main():
    a = [5, 2, 8, 1, 9]
    n = len(a)
    for i in range(n - 1):
        for j in range(n - i - 1):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
    print(" ".join(map(str, a)))


if __name__ == "__main__":
    main()
`,
  },
  functions: {
    label: 'Functions',
    code: `def add(a, b):
    return a + b


def main():
    print(add(17, 25))


if __name__ == "__main__":
    main()
`,
  },
  largestOfThree: {
    label: 'Largest of three',
    code: `def main():
    a, b, c = 12, 27, 19
    print(max(a, b, c))


if __name__ == "__main__":
    main()
`,
  },
};

export const SAMPLES_BY_LANG = {
  cpp: CPP_SAMPLES,
  c: C_SAMPLES,
  java: JAVA_SAMPLES,
  python: PYTHON_SAMPLES,
};

export const LANGUAGE_META = {
  cpp: { label: 'C++', file: 'main.cpp', monaco: 'cpp' },
  c: { label: 'C', file: 'main.c', monaco: 'c' },
  java: { label: 'Java', file: 'Main.java', monaco: 'java' },
  python: { label: 'Python', file: 'main.py', monaco: 'python' },
};
