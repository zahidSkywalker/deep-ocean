import sys

def solve():
    data = sys.stdin.read().strip().split()
    if not data:
        return
    n = int(data[0])
    s = data[1] if len(data) > 1 else ""
    
    sf_count = 0  # times trip went from S to F
    fs_count = 0  # times trip went from F to S
    
    for i in range(n - 1):
        if s[i] == 'S' and s[i + 1] == 'F':
            sf_count += 1
        elif s[i] == 'F' and s[i + 1] == 'S':
            fs_count += 1
    
    print("YES" if sf_count > fs_count else "NO")

solve()
