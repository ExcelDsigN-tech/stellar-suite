export interface SimulationResult {
  success: boolean;
  result?: unknown;
  error?: string;
  resourceUsage?: {
    cpuInstructions?: number;
    memoryBytes?: number;
    minResourceFee?: string;
  };
  events?: unknown[];
  auth?: unknown[];
}

export interface CustomHeaders {
  [key: string]: string;
}

const normalizeResourceUsage = (value: unknown): SimulationResult["resourceUsage"] => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const input = value as {
    cpuInstructions?: unknown;
    cpu_instructions?: unknown;
    memoryBytes?: unknown;
    memory_bytes?: unknown;
    minResourceFee?: unknown;
    min_resource_fee?: unknown;
  };

  const cpuCandidate = input.cpuInstructions ?? input.cpu_instructions;
  const memoryCandidate = input.memoryBytes ?? input.memory_bytes;
  const feeCandidate = input.minResourceFee ?? input.min_resource_fee;

  return {
    cpuInstructions: typeof cpuCandidate === "number" ? cpuCandidate : undefined,
    memoryBytes: typeof memoryCandidate === "number" ? memoryCandidate : undefined,
    minResourceFee: typeof feeCandidate === "string" ? feeCandidate : undefined,
  };
};

export class RpcService {
  private rpcUrl: string;
  private customHeaders: CustomHeaders;

  constructor(rpcUrl: string, customHeaders: CustomHeaders = {}) {
    this.rpcUrl = rpcUrl.endsWith("/") ? rpcUrl.slice(0, -1) : rpcUrl;
    this.customHeaders = customHeaders;
  }

  setCustomHeaders(headers: CustomHeaders): void {
    this.customHeaders = headers;
  }

  async simulateTransaction(
    contractId: string,
    functionName: string,
    args: unknown[],
  ): Promise<SimulationResult> {
    try {
      const requestBody = {
        jsonrpc: "2.0",
        id: 1,
        method: "simulateTransaction",
        params: {
          transaction: {
            contractId,
            functionName,
            args: args.map((arg) => ({
              value: arg,
            })),
          },
        },
      };

      const response = await fetch(`${this.rpcUrl}/rpc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.customHeaders,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `RPC request failed with status ${response.status}: ${response.statusText}`,
        };
      }

      const data: {
        result?: {
          returnValue?: unknown;
          result?: unknown;
          resourceUsage?: unknown;
          resource_usage?: unknown;
        };
        error?: { message?: string };
      } = await response.json();

      if (data.error) {
        return {
          success: false,
          error: data.error.message || "RPC error occurred",
        };
      }

      const result = data.result;

      return {
        success: true,
        result: result?.returnValue ?? result?.result ?? result,
        resourceUsage: normalizeResourceUsage(result?.resourceUsage ?? result?.resource_usage),
      };
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        return {
          success: false,
          error: `Network error: Unable to reach RPC endpoint at ${this.rpcUrl}. Check your connection and rpcUrl setting.`,
        };
      }

      if (error instanceof Error && error.name === "AbortError") {
        return {
          success: false,
          error:
            "Request timed out. The RPC endpoint may be slow or unreachable.",
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
