import time
from pylint import epylint as lint
from memory_profiler import memory_usage

def analyze_code(code):
    # 코드 실행 시간 측정
    start_time = time.time()
    exec(code)
    end_time = time.time()
    execution_time = end_time - start_time
    
    # 코드 스타일 분석
    (pylint_stdout, pylint_stderr) = lint.py_run(code, return_std=True)
    pylint_output = pylint_stdout.getvalue()
    
    # 메모리 사용량 측정
    mem_usage = memory_usage((exec, (code,)), interval=0.1, timeout=1)
    max_memory_usage = max(mem_usage)
    
    # 요약 보고서 생성
    report = {
        "Execution Time (s)": execution_time,
        "Pylint Output": pylint_output,
        "Max Memory Usage (MiB)": max_memory_usage,
    }
    
    return report

# 분석할 코드 예시
sample_code = """
def example_function():
    return sum([i**2 for i in range(1000)])

example_function()
"""

# 보고서 생성
report = analyze_code(sample_code)
print(report)
