import { ref, reactive } from "vue";
import type { Session, LoginFlow, RegistrationFlow } from "@ory/kratos-client";
import { FrontendApi, Configuration } from "@ory/kratos-client";

interface AuthError {
  message: string;
  details?: Record<string, any>;
}

export const useAuth = () => {
  const config = useRuntimeConfig();
  const ory = new FrontendApi(
    new Configuration({
      basePath: config.public.ORY_SDK_URL,
      baseOptions: {
        withCredentials: true,
      },
    })
  );

  const user = reactive({
    id: "",
    email: "",
  });
  const isAuthenticated = ref(false);
  const isLoading = ref(false);
  const error = ref<AuthError | null>(null);
  const loginFlow = ref<LoginFlow | null>(null);
  const registrationFlow = ref<RegistrationFlow | null>(null);

  const setUser = (session: Session) => {
    if (!session.identity) {
      return;
    }

    user.id = session.identity.id;
    user.email = session.identity.traits.email;
    isAuthenticated.value = true;
  };

  const handleError = (err: unknown): AuthError => {
    if (err instanceof Error) {
      return { message: err.message };
    }
    if (typeof err === 'object' && err !== null && 'response' in err) {
      const errorResponse = (err as any).response?.data;
      if (errorResponse && typeof errorResponse === 'object') {
        return {
          message: errorResponse.error?.message || 'An unknown error occurred',
          details: errorResponse.error?.details,
        };
      }
    }
    return { message: 'An unknown error occurred' };
  };

  const checkAuth = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      const { data: session } = await ory.toSession();
      setUser(session);
    } catch (err) {
      error.value = handleError(err);
      isAuthenticated.value = false;
    } finally {
      isLoading.value = false;
    }
  };

  const initializeLoginFlow = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await ory.createBrowserLoginFlow();
      loginFlow.value = data;
    } catch (err) {
      error.value = handleError(err);
    } finally {
      isLoading.value = false;
    }
  };

  const login = async (formData: Record<string, string>) => {
    isLoading.value = true;
    error.value = null;
    try {
      if (!loginFlow.value) {
        throw new Error("Login flow not initialized");
      }
      const { data: successfulNativeLogin } = await ory.updateLoginFlow({
        flow: loginFlow.value.id,
        updateLoginFlowBody: formData,
      });
      setUser(successfulNativeLogin.session);
      return true;
    } catch (err) {
      error.value = handleError(err);
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const logout = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      await ory.createBrowserLogoutFlow();
      isAuthenticated.value = false;
      user.id = "";
      user.email = "";
    } catch (err) {
      error.value = handleError(err);
    } finally {
      isLoading.value = false;
    }
  };

  const initializeRegistrationFlow = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await ory.createBrowserRegistrationFlow();
      registrationFlow.value = data;
    } catch (err) {
      error.value = handleError(err);
    } finally {
      isLoading.value = false;
    }
  };

  const register = async (formData: Record<string, string>) => {
    isLoading.value = true;
    error.value = null;
    try {
      if (!registrationFlow.value) {
        throw new Error("Registration flow not initialized");
      }
      const { data: successfullNativeRegistration } = await ory.updateRegistrationFlow({
        flow: registrationFlow.value.id,
        updateRegistrationFlowBody: formData,
      });

      if (!successfullNativeRegistration.session) {
        error.value = { message: "Registration successful but no session created" };
        return false;
      }
      setUser(successfullNativeRegistration.session);
      return true;
    } catch (err) {
      error.value = handleError(err);
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    loginFlow,
    registrationFlow,
    checkAuth,
    initializeLoginFlow,
    login,
    logout,
    initializeRegistrationFlow,
    register,
    clearError,
  };
};
