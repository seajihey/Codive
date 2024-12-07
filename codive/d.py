import sys
import json
import tracemalloc
import time
from io import StringIO
import contextlib

# stdout 캡처를 위한 context manager
@contextlib.contextmanager
def stdoutIO(stdout=None):
    old = sys.stdout  # 기존 stdout 백업
    if stdout is None:
        stdout = StringIO()  # 기본적으로 StringIO로 설정
    sys.stdout = stdout
    yield stdout
    sys.stdout = old  # 실행 후 기존 stdout으로 복구

def measure_performance(code):
    start_time = time.perf_counter()  # 실행 시간 측정 시작
    tracemalloc.start()  # 메모리 추적 시작

    try:
        with stdoutIO() as s:  # stdout을 StringIO로 리디렉션
            exec(code)  # 코드 실행
        error = ""
    except Exception as e:
        error = str(e)
        s = StringIO()  # 에러 발생 시 출력 스트림을 빈 StringIO로 설정

    current, peak = tracemalloc.get_traced_memory()  # 메모리 사용량 추적
    tracemalloc.stop()  # 메모리 추적 종료

    end_time = time.perf_counter()  # 실행 종료 시간

    execution_time = (end_time - start_time) * 1000  # 밀리초로 변환

    result = {
        "stdout": s.getvalue(),  # stdout 결과
        "error": error,  # 오류 메시지
        "execution_time": execution_time,  # 실행 시간 (ms)
        "memory_usage": peak / 1024  # 메모리 사용량 (KB)
    }
    
    print(json.dumps(result))  # JSON 형식으로 결과 출력

def main():
    input_data = sys.stdin.read()  # 표준 입력 읽기
    request = json.loads(input_data)  # JSON 파싱
    code = request.get("code", "").replace("\\n", "\n").replace("\\t", "\t")  # 코드 전처리
    measure_performance(code)  # 성능 측정

if __name__ == '__main__':
    main()
