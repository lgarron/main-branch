import { AuthStorage, info, parseRepo, setAuthStorage } from "../../index";

setAuthStorage(AuthStorage.LocalStorage);
info(parseRepo("cubing/icons"));
